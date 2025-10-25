// components/tutorial/map.tsx
"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import Map from "react-map-gl/mapbox";
import {
  Source,
  Layer,
  Marker,
  Popup,
  type LayerSpecification,
} from "react-map-gl/mapbox";
import useSWR from "swr";

// Location coordinates mapping
const LOCATION_COORDINATES: Record<string, [number, number]> = {
  "PG1: GOLD GARAGE": [25.7547, -80.3721],
  "PG2: BLUE GARAGE": [25.7537, -80.3721],
  "PG3: PANTHER GARAGE": [25.758425, -80.379844],
  "PG4: RED GARAGE": [25.760151, -80.373158],
  "PG5: MARKET STATION": [25.760102, -80.371656],
  "PG6: TECH STATION": [25.760107, -80.374574],
  "LOT2A: SOUTH OF HLS1": [25.757159, -80.371527],
  "LOT2B: EAST OF GRAHAM CENTER": [25.756748, -80.371554],
  "LOT3: EAST OF BOOK STORE": [25.75513, -80.370575],
  "LOT4: EAST OF BLUE GARAGE": [25.753737, -80.371014],
  "LOT5: EAST OF PAC": [25.752673, -80.370607],
  "LOT6: HOUSING EAST STADIUM": [25.752354, -80.375049],
  "LOT7: WEST OF THE STADIUM": [25.752838, -80.380617],
  "LOT8: SOUTH OF REC. COMPLEX": [25.75557, -80.376875],
  "LOT9: WEST OF EDU. BUILDING": [25.758831, -80.378146],
  "LOT10: WEST OF FIU ARENA": [25.757166, -80.381223],
  "LOT12: PARKVIEW RD": [25.754453, -80.377248],
  "LOT13: UNIVERSITY TOWERS": [25.755072, -80.376336],
  "LOT14: UNIVERSITY APARTMENTS": [25.758076, -80.370167],
  "LOT21: PC LOADING": [25.755023, -80.373721],
  "LOT24:EAST & WEST OF STADIUM": [25.752452, -80.376773],
  "TH: Tamiami Hall Loading": [25.752892, -80.375797],
  "LV-CIR: LAKEVIEW CIRCLE": [25.753902, -80.374198],
};

const prefixMap: Record<string, string> = {
  "11": "01",
  "73": "02",
  "04": "03",
};

interface LatestCitationInfo {
  prefix: string;
  date: string;
  location: string;
  rawDate: string | null;
}

// ✨ NEW: Interface for daily totals
interface DailyTotal {
  prefix: string;
  total_amount: number;
}

const parkingGarageFillStyle: LayerSpecification = {
  id: "parking-garage-fill",
  type: "fill",
  source: "custom-garages",
  "source-layer": "fiu-parking-garges",
  filter: ["==", "type", "custom-garage"],
  paint: {
    "fill-color": "#0b4a9d",
    "fill-opacity": 0.1,
  },
};

const parkingGarageBorderStyle: LayerSpecification = {
  id: "parking-garage-border",
  type: "line",
  source: "custom-garages",
  "source-layer": "fiu-parking-garges",
  filter: ["==", "type", "custom-garage"],
  paint: {
    "line-color": "#0b4a9d",
    "line-width": 1,
    "line-opacity": 1,
  },
};

const parkingGarageLabelStyle: LayerSpecification = {
  id: "parking-garage-label",
  type: "symbol",
  source: "custom-garages",
  "source-layer": "fiu-parking-garges",
  filter: ["==", "type", "custom-garage"],
  layout: {
    "text-field": ["get", "name"],
    "text-size": 12,
    "text-anchor": "top",
    "symbol-spacing": 5000,
  },
  paint: {
    "text-color": "#6B7281",
    "text-halo-color": "#000000",
    "text-halo-width": 0.2,
  },
};

const fetcher = (key: string) =>
  fetch(key).then((res) => {
    if (!res.ok) {
      throw new Error("An error occurred while fetching the data.");
    }
    return res.json();
  });

// Helper function to check if citation is recent (within last 10 hours)
function isRecentCitation(rawDate: string | null): boolean {
  if (!rawDate) return false;
  const citationTime = new Date(rawDate).getTime();
  const now = new Date().getTime();
  const tenHoursInMs = 10 * 60 * 60 * 10000000;
  return now - citationTime < tenHoursInMs;
}

// Helper function to normalize location string for lookup
function normalizeLocation(location: string): string {
  return location.toUpperCase().trim();
}

// ✨ NEW: Format location for display (matching your latest-citation component)
function formatLocation(locationStr: string): string {
  const parts = locationStr.split(":");
  if (parts.length < 2) {
    return locationStr;
  }

  const prefix = parts[0];
  const description = parts[1].trim();

  const titleCasedDescription = description
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${prefix}: ${titleCasedDescription}`;
}

export default function MapComponent() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  // ✨ NEW: State to track which officer's popup is open
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);

  // Fetch latest citations
  const { data: latestCitations } = useSWR<LatestCitationInfo[]>(
    "/api/citations",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false,
    }
  );

  // ✨ NEW: Fetch daily totals
  const { data: dailyTotals } = useSWR<DailyTotal[]>(
    "/api/daily-totals",
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
    }
  );

  const initialViewState = {
    longitude: -80.375,
    latitude: 25.757,
    zoom: 16,
  };

  // Filter citations that are recent and have valid coordinates
  const activeCitations = latestCitations?.filter((citation) => {
    if (!isRecentCitation(citation.rawDate)) return false;
    const normalizedLocation = normalizeLocation(citation.location);
    return LOCATION_COORDINATES[normalizedLocation] !== undefined;
  });

  // ✨ NEW: Create a map for quick lookup of daily totals
  const totalsMap = new globalThis.Map<string, number>(
    dailyTotals?.map((item) => [item.prefix, item.total_amount]) ?? []
  );

  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={initialViewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/standard"
      minZoom={13}
      onLoad={() => setIsMapLoaded(true)}
      // ✨ NEW: Close popup when clicking on the map
      onClick={() => setSelectedOfficer(null)}
    >
      {isMapLoaded && (
        <Source
          id="custom-garages"
          type="vector"
          url="mapbox://kevinsanchez.cmfy7zv652zch1npvk2bhp5oi-9kc5d"
        >
          <Layer {...parkingGarageFillStyle} />
          <Layer {...parkingGarageBorderStyle} />
          <Layer {...parkingGarageLabelStyle} />
        </Source>
      )}

      {/* Render markers for active citations */}
      {activeCitations?.map((citation) => {
        const normalizedLocation = normalizeLocation(citation.location);
        const coordinates = LOCATION_COORDINATES[normalizedLocation];

        if (!coordinates) return null;

        const [latitude, longitude] = coordinates;
        const officerNumber = prefixMap[citation.prefix] || citation.prefix;
        const totalToday = totalsMap.get(citation.prefix) || 0;

        return (
          <React.Fragment key={citation.prefix}>
            <Marker
              latitude={latitude}
              longitude={longitude}
              anchor="bottom"
              // ✨ NEW: Handle marker click
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedOfficer(citation.prefix);
              }}
            >
              <div className="relative flex flex-col items-center cursor-pointer">
                {/* Pulsing animation ring */}
                <div
                  className="absolute -top-2 w-12 h-12 rounded-full bg-green-500 opacity-75"
                  style={{
                    animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                  }}
                />

                {/* Officer pin */}
                <div className="relative bg-[#9297A3] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white z-10 hover:scale-110 transition-transform">
                  {officerNumber}
                </div>

                {/* Pin pointer */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-400 -mt-1" />
              </div>
            </Marker>

            {/* ✨ Popup positioned above the pin */}
            {/* ✨ Popup positioned above the pin */}
            {selectedOfficer === citation.prefix && (
              <Popup
                latitude={latitude}
                longitude={longitude}
                anchor="bottom"
                onClose={() => setSelectedOfficer(null)}
                closeButton={false} // ✨ NEW: Removes the X button
                closeOnClick={false}
                offset={50}
                className="officer-popup"
              >
                <div className="p-3 min-w-[200px]">
                  {" "}
                  {/* ✨ ADDED: rounded-xl for more rounded corners */}
                  {/* Citation details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h1 className="font-bold text-black text-sm">
                        Officer {officerNumber}
                      </h1>
                      <h1 className="text-[#898989] text-xs">
                        ${totalToday.toFixed(2)} tdy.
                      </h1>
                    </div>
                    <div className="flex flex-row gap-2 overflow-hidden">
                      <h1 className="text-[#898989] text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                        {formatLocation(citation.location)}
                      </h1>
                      <h1 className="text-[#898989] text-xs shrink-0">•</h1>
                      <h1 className="text-[#898989] text-xs shrink-0">
                        {citation.date}
                      </h1>
                    </div>
                  </div>
                </div>
              </Popup>
            )}
          </React.Fragment>
        );
      })}
    </Map>
  );
}

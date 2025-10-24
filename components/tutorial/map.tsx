"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import Map from "react-map-gl/mapbox";
import { Source, Layer, type LayerSpecification } from "react-map-gl/mapbox";

const parkingGarageFillStyle: LayerSpecification = {
  id: "parking-garage-fill",
  type: "fill",
  source: "custom-garages",
  "source-layer": "fiu-parking-garges", // This is usually the name of your dataset
  filter: ["==", "type", "custom-garage"], // Filter by our custom property
  paint: {
    "fill-color": "#0b4a9d",
    "fill-opacity": 0.1,
  },
};

const parkingGarageBorderStyle: LayerSpecification = {
  id: "parking-garage-border",
  type: "line",
  source: "custom-garages", // Use our new source ID
  "source-layer": "fiu-parking-garges", // This is usually the name of your dataset
  filter: ["==", "type", "custom-garage"], // Filter by our custom property
  paint: {
    "line-color": "#0b4a9d",
    "line-width": 1,
    "line-opacity": 1,
  },
};

// Style for the labels of the parking garages
const parkingGarageLabelStyle: LayerSpecification = {
  id: "parking-garage-label",
  type: "symbol",
  source: "custom-garages", // Use our new source ID
  "source-layer": "fiu-parking-garges",
  filter: ["==", "type", "custom-garage"], // Filter by our custom property
  layout: {
    "text-field": ["get", "name"],
    "text-size": 12,
    "text-anchor": "top",
    // ADD THIS LINE: Prevents the label from repeating on large features
    "symbol-spacing": 5000,
  },
  paint: {
    "text-color": "#6B7281",
    "text-halo-color": "#000000",
    "text-halo-width": 0.2,
    // "text-halo-blur": 0.1,
  },
};

export default function MapComponent() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const initialZoom = typeof window !== "undefined" ? (window.innerWidth >= 768 ? 16 : 14) : 16;

  // Set up the initial viewport state
  const initialViewState = {
    longitude: -80.375,
    latitude: 25.757,
    zoom: initialZoom,
  };

  return (
    // The MapProvider is needed for some advanced features, good to have it from the start
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={initialViewState}
      style={{ width: "100%", height: "100%" }}
      // You can switch out the map style here
      mapStyle="mapbox://styles/mapbox/standard"
      minZoom={13}
      onLoad={() => setIsMapLoaded(true)}
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
    </Map>
  );
}

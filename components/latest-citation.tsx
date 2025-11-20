// components/latest-citation.tsx

"use client";

import useSWR from "swr";

interface LatestCitationInfo {
  prefix: string;
  date: string;
  location: string;
  rawDate: string | null;
}

// NEW: Interface for the daily totals data
interface DailyTotal {
  prefix: string;
  total_amount: number;
}

// --- NEW: Define the prefix mapping object ---
const prefixMap: { [key: string]: string } = {
  "11": "01",
  "73": "02",
  "04": "03",
  "72": "04",
};
// ---
// --- NEW HELPER FUNCTION for formatting the location string ---
function formatLocation(locationStr: string): string {
  // Split the string at the first colon
  const parts = locationStr.split(":");

  // If there's no colon, return the original string
  if (parts.length < 2) {
    return locationStr;
  }

  const prefix = parts[0];
  const description = parts[1].trim(); // Get the part after the colon and remove whitespace

  // Convert the description to title case
  const titleCasedDescription = description
    .toLowerCase() // e.g., "gold garage"
    .split(" ") // e.g., ["gold", "garage"]
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // e.g., ["Gold", "Garage"]
    .join(" "); // e.g., "Gold Garage"

  // Recombine the prefix and the newly formatted description
  return `${prefix}: ${titleCasedDescription}`;
}
// ---

const fetcher = (key: string) =>
  fetch(key).then((res) => {
    if (!res.ok) {
      throw new Error("An error occurred while fetching the data.");
    }
    return res.json();
  });

export default function LatestCitation() {
  const {
    data: latestCitations, // Renamed for clarity
    error,
    isLoading,
  } = useSWR<LatestCitationInfo[]>("/api/citations", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  const {
    data: dailyTotals,
    error: _totalsError,
    isLoading: totalsLoading,
  } = useSWR<DailyTotal[]>("/api/daily-totals", fetcher, {
    /* swr options */
  });

  const totalsMap = new Map(dailyTotals?.map((item) => [item.prefix, item.total_amount]));

  // --- NEW: Create a sorted copy of the citations before rendering ---
  const sortedCitations = latestCitations
    ? [...latestCitations].sort((a, b) => {
        // Push items with no date to the bottom of the list
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;

        // Sort by the raw timestamp in descending order (most recent first)
        return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
      })
    : [];

  if (isLoading || totalsLoading) {
    return (
      <main className="w-full h-full  justify-center items-center flex">
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
      </main>
    );
  }

  if (error || totalsLoading) {
    return <p className="text-red-500 text-lg">Error loading data.</p>;
  }

  return (
    <div className="flex flex-col">
      {sortedCitations.map((item) => {
        // Get the total for the current prefix from our lookup map
        const totalToday = totalsMap.get(item.prefix) || 0;

        return (
          <div
            key={item.prefix}
            className="flex flex-row active:bg-black/10 active:text-white gap-3 rounded-2xl p-2 py-4 cursor-pointer"
          >
            <div className="select-none aspect-square relative size-11 stroke-current rounded-full border-[3px] border-white ">
              <div className="select-none absolute w-full h-full bg-[#9297A3] text-white rounded-full p-2 flex justify-center items-center font-bold">
                {prefixMap[item.prefix] || item.prefix}
              </div>
            </div>
            <div className="flex flex-col w-full gap-0.5 min-w-0">
              <div className="flex justify-between  items-center">
                <h1 className="font-bold text-black text-sm">
                  Officer {prefixMap[item.prefix] || item.prefix}
                </h1>
                {/* UPDATED: Display the total for today */}
                <h1 className="text-[#898989] text-xs">${totalToday.toFixed(2)} tdy.</h1>
              </div>
              <div className="flex flex-row gap-2 overflow-hidden">
                <h1 className="text-[#898989] text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                  {formatLocation(item.location)}
                </h1>
                <h1 className="text-[#898989] text-xs shrink-0">•</h1>
                <h1 className="text-[#898989] text-xs shrink-0">{item.date}</h1>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// components/watched-citations.tsx

"use client";

import useSWR from "swr";
import { formatLocation } from "@/lib/utils";

interface WatchedCitation {
  citationNumber: string;
  issued: string;
  location: string;
  amount: number | null;
}

const fetcher = (key: string) =>
  fetch(key).then((res) => {
    if (!res.ok) {
      throw new Error("An error occurred while fetching the data.");
    }
    return res.json();
  });

export default function WatchedCitations() {
  const { data: watched } = useSWR<WatchedCitation[]>("/api/watched-citations", fetcher, {
    revalidateOnFocus: false,
  });

  if (!watched || watched.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col border-t border-gray-200/50 mt-2 pt-2">
      <h2 className="text-[#898989] text-xs font-semibold uppercase px-2 pt-2">Watching</h2>
      {watched.map((item) => (
        <div key={item.citationNumber} className="flex flex-col gap-0.5 rounded-2xl p-2 py-3 min-w-0">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-black text-sm">{item.citationNumber}</h1>
            {item.amount != null && (
              <h1 className="text-[#898989] text-xs">${Number(item.amount).toFixed(2)}</h1>
            )}
          </div>
          <div className="flex flex-row gap-2 overflow-hidden">
            <h1 className="text-[#898989] text-xs whitespace-nowrap overflow-hidden text-ellipsis">
              {formatLocation(item.location)}
            </h1>
            <h1 className="text-[#898989] text-xs shrink-0">•</h1>
            <h1 className="text-[#898989] text-xs shrink-0">issued {item.issued}</h1>
          </div>
        </div>
      ))}
    </div>
  );
}

// app/api/daily-totals/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CITATION_SERIES, seriesFromCitationNumber } from "@/lib/citation-series";

// Ensure this route is always dynamic and not cached
export const dynamic = "force-dynamic";

// Midnight today in Miami time, as an ISO string with the correct UTC offset (EST or EDT).
function startOfTodayEastern(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")!
    .value.replace("GMT", "");
  return `${date}T00:00:00${offset}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("citations")
      .select("citation_number, amount")
      .like("citation_number", "PAT20%")
      .gte("citation_date", startOfTodayEastern());

    if (error) {
      console.error("Error fetching today's citations:", error);
      throw new Error(error.message);
    }

    // Sum today's amounts per series, keeping series with no citations at 0.
    const totals = new Map<string, number>(CITATION_SERIES.map((series) => [series, 0]));
    for (const citation of data ?? []) {
      const series = seriesFromCitationNumber(citation.citation_number);
      if (totals.has(series)) {
        totals.set(series, totals.get(series)! + Number(citation.amount ?? 0));
      }
    }

    return NextResponse.json(
      Array.from(totals, ([prefix, total_amount]) => ({ prefix, total_amount }))
    );
  } catch (e) {
    const error = e as Error;
    // Now you can safely use error.message
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

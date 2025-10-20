// app/api/citations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
// This function does the date formatting on the server
function formatRelativeTime(citationDateString: string): string {
  // The string from the DB is now a correct, timezone-aware ISO string.
  // The JS Date constructor will parse it correctly into the right moment in time.
  const citationDate = new Date(citationDateString);
  const now = new Date(); // The current time on the server (in UTC)

  const diffMs = now.getTime() - citationDate.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60)); // Use round for closer accuracy
  const diffHours = Math.round(diffMinutes / 60);

  // --- Optional: Add a log to confirm the correct difference ---
  console.log(`[TIME DEBUG] Citation Date/Time: ${citationDate}`);
  console.log(`[TIME DEBUG] Current Date/Time: ${now}`);
  console.log(`[TIME DEBUG] Correct difference in minutes: ${diffMinutes}`);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min. ago`;

  const hourText = diffHours === 1 ? "hr." : "hrs.";
  return `${diffHours} ${hourText} ago`;
}

// ... (type definitions remain the same) ...
// UPDATED: Type definitions to include citation_number
// Update the type definitions to include the raw date
type QueryResultData = { citation_date: string; location: string };
type QueryResult = {
  data: QueryResultData[] | null;
  error: PostgrestError | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    // ... (connection check logic is the same) ...
    const { error: connectionError } = await supabase
      .from("citations")
      .select("citation_number")
      .limit(1);
    if (connectionError) {
      throw new Error(
        `Failed to connect to Supabase: ${connectionError.message}`
      );
    }

    const prefixes = ["73", "11", "04"];
    const dateQueries = /* ... (query logic is the same) ... */ prefixes.map(
      (prefix) =>
        supabase
          .from("citations")
          .select("citation_date, location")
          .like("citation_number", `${prefix}%`)
          .order("citation_date", { ascending: false })
          .limit(1)
    );
    const results = await Promise.all(dateQueries);

    // ... (error checking for results is the same) ...
    for (const result of results) {
      if (result.error) {
        throw new Error(`Supabase query failed: ${result.error.message}`);
      }
    }

    const latestCitations = results.map(
      (result: QueryResult, index: number) => {
        let formattedDate = "No data yet";
        let location = "N/A";
        let rawDate = null; // Initialize rawDate as null

        if (result.data && result.data.length > 0) {
          const latest = result.data[0];
          rawDate = latest.citation_date; // Keep the original ISO string
          formattedDate = formatRelativeTime(latest.citation_date);
          location = latest.location;
        }
        return {
          prefix: prefixes[index],
          date: formattedDate,
          location: location,
          rawDate: rawDate, // Add the raw date to the response
        };
      }
    );

    return NextResponse.json(latestCitations);
  } catch (e) {
    const error = e as Error;
    // Now you can safely use error.message
    return NextResponse.json({ error: error.message }, { status: 500 });
    // ... (error handling is the same) ...
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
// This function does the date formatting on the server
function formatRelativeTime(citationDateString: string): string {
  // Step 1: Get the raw date string from the DB (e.g., "2025-09-25T19:31:00+00:00")
  const dbDate = new Date(citationDateString);

  // Step 2: Extract the year, month, day, hours, etc., in UTC.
  // This effectively treats the stored time as the "wall clock" time we want.
  const year = dbDate.getUTCFullYear();
  const month = dbDate.getUTCMonth();
  const day = dbDate.getUTCDate();
  const hours = dbDate.getUTCHours();
  const minutes = dbDate.getUTCMinutes();
  const seconds = dbDate.getUTCSeconds();

  // Step 3: Create a new Date object by explicitly telling JavaScript that these
  // components belong to the "America/New_York" timezone.
  // We do this by constructing a new timezone-aware string.
  // Note: Months are 0-indexed in JS, so we don't need to adjust.
  const correctedDateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  // By creating the date this way, the JS engine correctly interprets the wall-clock time in the context of the specified timezone.
  const citationDate = new Date(
    new Date(correctedDateString).toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  const now = new Date(); // Current server time (UTC)

  // --- Debugging Logs ---
  console.log(`[TIME DEBUG] Original DB String: ${citationDateString}`);
  console.log(
    `[TIME DEBUG] Corrected Citation Date (EST): ${citationDate.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "long",
      timeStyle: "long",
    })}`
  );
  console.log(
    `[TIME DEBUG] Current Time (EST): ${now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "long",
      timeStyle: "long",
    })}`
  );
  // ---

  const diffMs = now.getTime() - citationDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  console.log(`[TIME DEBUG] Difference - Minutes: ${diffMinutes}, Hours: ${diffHours}`);
  console.log("---");

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min. ago`;

  const hourText = diffHours === 1 ? "hr." : "hrs.";
  return `${diffHours} ${hourText} ago`;
}

// ... (type definitions remain the same) ...
// UPDATED: Type definitions to include citation_number
// Update the type definitions to include the raw date
type QueryResultData = { citation_date: string; location: string };
type QueryResult = { data: QueryResultData[] | null; error: PostgrestError | null };

export async function GET() {
  try {
    const supabase = await createClient();
    // ... (connection check logic is the same) ...
    const { error: connectionError } = await supabase
      .from("citations")
      .select("citation_number")
      .limit(1);
    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`);
    }

    const prefixes = ["73", "11", "04"];
    const dateQueries = /* ... (query logic is the same) ... */ prefixes.map((prefix) =>
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

    const latestCitations = results.map((result: QueryResult, index: number) => {
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
    });

    return NextResponse.json(latestCitations);
  } catch (e) {
    const error = e as Error;
    // Now you can safely use error.message
    return NextResponse.json({ error: error.message }, { status: 500 });
    // ... (error handling is the same) ...
  }
}

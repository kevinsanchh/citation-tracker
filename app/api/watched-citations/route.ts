// app/api/watched-citations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WATCHED_CITATIONS } from "@/lib/watched-citations";

export const dynamic = "force-dynamic";

// citation_date is the portal's issue date stored as midnight Miami time, so format it in that zone.
function formatIssueDate(citationDateString: string): string {
  return new Date(citationDateString).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("citations")
      .select("citation_number, citation_date, location, amount")
      .in("citation_number", WATCHED_CITATIONS)
      .order("citation_date", { ascending: false });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return NextResponse.json(
      (data ?? []).map((citation) => ({
        citationNumber: citation.citation_number,
        issued: formatIssueDate(citation.citation_date),
        location: citation.location,
        amount: citation.amount,
      }))
    );
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

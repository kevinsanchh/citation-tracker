import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ensure this route is always dynamic and not cached
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Call the database function using rpc (Remote Procedure Call)
    const { data, error } = await supabase.rpc("get_daily_totals");

    if (error) {
      console.error("Error calling get_daily_totals function:", error);
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (e) {
    const error = e as Error;
    // Now you can safely use error.message
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

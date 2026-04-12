import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc("record_visit");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ value: data as number });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";

export async function GET() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: objectives, error } = await db
    .from("objectives")
    .select("*")
    .order("threshold", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ objectives });
}

export async function POST(request: Request) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { threshold?: number; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const threshold = Number(body.threshold);
  const description = (body.description ?? "").trim();
  if (!Number.isFinite(threshold) || threshold < 0 || !description) {
    return NextResponse.json(
      { error: "Seuil et description requis" },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const { data: counterRow } = await db
    .from("counter")
    .select("value")
    .limit(1)
    .single();

  const current = counterRow?.value ?? 0;
  let status: "locked" | "unlocked" = "locked";
  if (threshold <= current) {
    status = "unlocked";
  }

  const { data: row, error } = await db
    .from("objectives")
    .insert({
      threshold,
      description,
      status,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ objective: row });
}

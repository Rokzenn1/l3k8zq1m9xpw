import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
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

  const db = createServiceClient();
  const { data: existing, error: fetchErr } = await db
    .from("objectives")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (existing.status !== "locked") {
    return NextResponse.json(
      { error: "Modification impossible : objectif déjà atteint ou validé" },
      { status: 400 },
    );
  }

  const threshold =
    body.threshold !== undefined ? Number(body.threshold) : undefined;
  const description =
    body.description !== undefined
      ? String(body.description).trim()
      : undefined;

  if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) {
    return NextResponse.json({ error: "Seuil invalide" }, { status: 400 });
  }
  if (description !== undefined && !description) {
    return NextResponse.json({ error: "Description vide" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (threshold !== undefined) patch.threshold = threshold;
  if (description !== undefined) patch.description = description;

  const { data: counterRow } = await db
    .from("counter")
    .select("value")
    .limit(1)
    .single();
  const current = counterRow?.value ?? 0;
  if (threshold !== undefined) {
    patch.status = threshold <= current ? "unlocked" : "locked";
  }

  const { data: row, error } = await db
    .from("objectives")
    .update(patch)
    .eq("id", id)
    .eq("status", "locked")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "Modification refusée (statut changé)" },
      { status: 409 },
    );
  }

  return NextResponse.json({ objective: row });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: existing, error: fetchErr } = await db
    .from("objectives")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (existing.status !== "locked") {
    return NextResponse.json(
      { error: "Suppression impossible : objectif déjà atteint ou validé" },
      { status: 400 },
    );
  }

  const { error } = await db.from("objectives").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

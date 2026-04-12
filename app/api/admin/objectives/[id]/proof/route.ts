import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";
import { proofStoragePathFromPublicUrl } from "@/lib/storage/proof-path";

type Params = { params: Promise<{ id: string }> };

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
  const { data: objective, error: fetchErr } = await db
    .from("objectives")
    .select("id, status, proof_url")
    .eq("id", id)
    .single();

  if (fetchErr || !objective) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (objective.status !== "validated") {
    return NextResponse.json(
      { error: "L’objectif doit être validé" },
      { status: 400 },
    );
  }

  if (!objective.proof_url) {
    return NextResponse.json(
      { error: "Aucune preuve à supprimer" },
      { status: 400 },
    );
  }

  const path = proofStoragePathFromPublicUrl(objective.proof_url);
  if (path) {
    const { error: rmErr } = await db.storage.from("proofs").remove([path]);
    if (rmErr) {
      return NextResponse.json(
        { error: `Storage : ${rmErr.message}` },
        { status: 500 },
      );
    }
  }

  const { data: row, error: updErr } = await db
    .from("objectives")
    .update({
      proof_url: null,
    })
    .eq("id", id)
    .eq("status", "validated")
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "Mise à jour impossible (conflit de statut)" },
      { status: 409 },
    );
  }

  return NextResponse.json({ objective: row });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";

export async function POST(request: Request) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await request.formData();
  const objectiveId = form.get("objectiveId");
  const file = form.get("file");

  if (typeof objectiveId !== "string" || !objectiveId) {
    return NextResponse.json({ error: "objectiveId requis" }, { status: 400 });
  }

  const hasFile = file instanceof File && file.size > 0;

  if (hasFile) {
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 50 Mo)" },
        { status: 400 },
      );
    }
  }

  const db = createServiceClient();
  const { data: objective, error: objErr } = await db
    .from("objectives")
    .select("id, status")
    .eq("id", objectiveId)
    .single();

  if (objErr || !objective) {
    return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });
  }

  if (objective.status !== "unlocked") {
    return NextResponse.json(
      { error: "Validation : statut doit être « atteint » (unlocked)" },
      { status: 400 },
    );
  }

  let proofUrl: string | null = null;

  if (hasFile && file instanceof File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
    const path = `${objectiveId}/${crypto.randomUUID()}.${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await db.storage.from("proofs").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = db.storage.from("proofs").getPublicUrl(path);
    proofUrl = publicUrl;
  }

  const { data: row, error: updErr } = await db
    .from("objectives")
    .update({
      status: "validated",
      proof_url: proofUrl,
    })
    .eq("id", objectiveId)
    .eq("status", "unlocked")
    .select()
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "Impossible de valider (conflit de statut)" },
      { status: 409 },
    );
  }

  return NextResponse.json({ objective: row, proofUrl });
}

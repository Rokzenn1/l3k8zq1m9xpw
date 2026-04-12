import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";
import { proofStoragePathFromPublicUrl } from "@/lib/storage/proof-path";

const REQUIRED_PHRASE = "REINITIALISER";

export async function POST(request: Request) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const phrase = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
  if (phrase !== REQUIRED_PHRASE) {
    return NextResponse.json(
      {
        error: `Confirmation invalide. Tape exactement : ${REQUIRED_PHRASE}`,
      },
      { status: 400 },
    );
  }

  const db = createServiceClient();

  const { data: objectives, error: listErr } = await db
    .from("objectives")
    .select("proof_url");

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const paths: string[] = [];
  for (const o of objectives ?? []) {
    const url = o.proof_url;
    if (typeof url === "string" && url) {
      const p = proofStoragePathFromPublicUrl(url);
      if (p) paths.push(p);
    }
  }

  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length > 0) {
    const { error: rmErr } = await db.storage.from("proofs").remove(uniquePaths);
    if (rmErr) {
      return NextResponse.json(
        { error: `Storage : ${rmErr.message}` },
        { status: 500 },
      );
    }
  }

  const { error: objErr } = await db
    .from("objectives")
    .update({ status: "locked", proof_url: null })
    .gte("threshold", -1);

  if (objErr) {
    return NextResponse.json({ error: objErr.message }, { status: 500 });
  }

  const { data: counterRow, error: cErr } = await db
    .from("counter")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (cErr || !counterRow?.id) {
    return NextResponse.json({ error: "Compteur introuvable" }, { status: 500 });
  }

  const { error: upCounter } = await db
    .from("counter")
    .update({ value: 0 })
    .eq("id", counterRow.id);

  if (upCounter) {
    return NextResponse.json({ error: upCounter.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

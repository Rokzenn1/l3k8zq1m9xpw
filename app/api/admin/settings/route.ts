import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin";

const MAX_LEN = 80;

export async function PATCH(request: Request) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { evg_first_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const raw =
    typeof body.evg_first_name === "string" ? body.evg_first_name : "";
  const evg_first_name = raw.trim().slice(0, MAX_LEN);

  const db = createServiceClient();
  const { data: row, error } = await db
    .from("site_settings")
    .upsert(
      { id: 1, evg_first_name },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: row });
}

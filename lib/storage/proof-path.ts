/** Extrait le chemin dans le bucket `proofs` à partir de l’URL publique Supabase Storage. */
export function proofStoragePathFromPublicUrl(publicUrl: string): string | null {
  if (!publicUrl?.trim()) return null;
  const trimmed = publicUrl.trim();
  const markers = ["/object/public/proofs/", "/public/proofs/"];
  for (const m of markers) {
    const i = trimmed.indexOf(m);
    if (i !== -1) {
      const rest = trimmed.slice(i + m.length);
      const q = rest.indexOf("?");
      return decodeURIComponent(q === -1 ? rest : rest.slice(0, q));
    }
  }
  try {
    const u = new URL(trimmed);
    const idx = u.pathname.indexOf("/proofs/");
    if (idx !== -1) {
      return decodeURIComponent(u.pathname.slice(idx + "/proofs/".length));
    }
  } catch {
    /* ignore */
  }
  return null;
}

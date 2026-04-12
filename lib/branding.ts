/**
 * Titre affiché sur la page publique.
 * - Si `NEXT_PUBLIC_EVENT_TITLE` est défini, il remplace tout (option avancée).
 * - Sinon : « EVG » + prénom depuis la base, ou « EVG 🎉 » si prénom vide.
 */
export function buildEventHeadline(evgFirstName: string | null | undefined): string {
  const envTitle = process.env.NEXT_PUBLIC_EVENT_TITLE?.trim();
  if (envTitle) return envTitle;

  const first = evgFirstName?.trim();
  if (first) return `EVG ${first} 🎉`;
  return "EVG 🎉";
}

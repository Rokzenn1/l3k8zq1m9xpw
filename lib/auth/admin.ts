export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

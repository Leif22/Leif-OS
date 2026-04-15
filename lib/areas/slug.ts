/** URL- und DB-tauglicher Slug aus Anzeigename (eindeutigkeit pro Nutzer separat sichern). */
export function slugifyAreaName(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return s || "bereich";
}

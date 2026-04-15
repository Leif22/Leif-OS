export type SparringListView = "offen" | "alle_aktiven" | "geloescht" | "alle";

export function parseSparringListView(raw: string | string[] | undefined): SparringListView {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "alle_aktiven" || v === "aktiv") return "alle_aktiven";
  if (v === "geloescht" || v === "papierkorb") return "geloescht";
  if (v === "alle") return "alle";
  return "offen";
}

export const SPARRING_LIST_VIEW_OPTIONS: { value: SparringListView; label: string }[] = [
  { value: "offen", label: "Nur offene" },
  { value: "alle_aktiven", label: "Offene und geschlossene" },
  { value: "geloescht", label: "Gelöschte" },
  { value: "alle", label: "Alle" },
];

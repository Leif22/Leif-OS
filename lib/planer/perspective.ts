/** Produktinterne Perspektiven des Planers (UI: Tages- vs. Wochenplanung). */
export type PlanerPerspektive = "tag" | "woche";

export const PLANER_PERSPEKTIVEN: readonly {
  readonly value: PlanerPerspektive;
  readonly label: string;
  readonly beschreibung: string;
}[] = [
  {
    value: "tag",
    label: "Tagesplanung",
    beschreibung: "Fokus auf einen Tag: Kapazität, Termine, Blöcke und Puffer für genau diesen Tag.",
  },
  {
    value: "woche",
    label: "Wochenplanung",
    beschreibung: "Überblick über die Woche: Verteilung, Traglast und freie Fenster über mehrere Tage.",
  },
] as const;

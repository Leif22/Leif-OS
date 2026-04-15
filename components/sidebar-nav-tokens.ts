/**
 * Sidebar: einheitliches Abstands- und Farbsystem (Desktop, ruhig, präzise).
 */
export const SIDEBAR_NAV = {
  asidePaddingTopPx: 24,
  asidePaddingBottomPx: 40,

  /** Kompakt, ohne „Mobile-Pill“-Anmutung */
  itemHeightPx: 34,
  itemRadiusPx: 8,

  gapWithinGroupPx: 8,
  gapBetweenGroupsPx: 30,
  /** Letzte Nav-Gruppe: etwas engerer Abstand */
  gapNotesMemoryPairPx: 4,

  colors: {
    text: "#374151",
    textActive: "#111111",
    icon: "#374151",
    iconActive: "#111111",
    /** Bewusst neutral-grau, ohne Grünstich */
    bgActive: "#F3F5F8",
    bgHover: "#F8FAFC",
    indicator: "#456990",
  },

  indicatorWidthPx: 2,
  /** Etwas weiter im Padding, nicht am äußeren Rand */
  indicatorInsetLeftPx: 11,
  /** Abstand Balken-Ende zur oberen/unteren Item-Kante (vertikal „eingebettet“) */
  indicatorVerticalInsetPx: 6,
  /** Leichte Abrundung der Indikator-Enden (px) */
  indicatorRadiusPx: 2,

  /** Fester Slot: optische Achse für alle Icons */
  iconSlotWidthPx: 22,
  iconSizePx: 18,
} as const;

export type LegacyPlannerFrequency = "taeglich" | "werktags" | "zweimal_woechentlich" | undefined;

export type PlannerRecurrenceRule =
  | {
      frequency: "daily";
      interval: number;
      start_date?: string;
    }
  | {
      frequency: "weekly";
      interval: number;
      weekdays: number[];
      start_date?: string;
    }
  | {
      frequency: "monthly";
      interval: number;
      mode: "day_of_month";
      day: number;
      start_date?: string;
    }
  | {
      frequency: "monthly";
      interval: number;
      mode: "nth_weekday";
      weekday: number;
      nth: number | "last" | "penultimate";
      start_date?: string;
    }
  | {
      frequency: "yearly";
      interval: number;
      month: number;
      day: number;
      start_date?: string;
    };

export const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

function normalizeIsoDateLocal(iso: string): Date | null {
  const date = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeInterval(value: number | undefined): number {
  return Math.max(1, Math.floor(value ?? 1));
}

function normalizeLegacyRecurrence(freq: LegacyPlannerFrequency): PlannerRecurrenceRule {
  if (freq === "werktags") return { frequency: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] };
  if (freq === "zweimal_woechentlich") return { frequency: "weekly", interval: 1, weekdays: [1, 4] };
  return { frequency: "daily", interval: 1 };
}

function lastWeekdayOfMonth(year: number, monthZeroBased: number, weekday: number): number {
  const lastDay = new Date(year, monthZeroBased + 1, 0).getDate();
  for (let d = lastDay; d >= 1; d -= 1) {
    const date = new Date(year, monthZeroBased, d);
    if (date.getDay() === weekday) return d;
  }
  return lastDay;
}

function penultimateWeekdayOfMonth(year: number, monthZeroBased: number, weekday: number): number {
  let hits = 0;
  const lastDay = new Date(year, monthZeroBased + 1, 0).getDate();
  for (let d = lastDay; d >= 1; d -= 1) {
    const date = new Date(year, monthZeroBased, d);
    if (date.getDay() !== weekday) continue;
    hits += 1;
    if (hits === 2) return d;
  }
  return lastWeekdayOfMonth(year, monthZeroBased, weekday);
}

export function normalizeRecurrenceRule(
  rule: PlannerRecurrenceRule | undefined,
  legacyFrequency: LegacyPlannerFrequency,
): PlannerRecurrenceRule {
  if (!rule) return normalizeLegacyRecurrence(legacyFrequency);
  const startDate = rule.start_date;
  if (rule.frequency === "daily") {
    return { frequency: "daily", interval: normalizeInterval(rule.interval), start_date: startDate };
  }
  if (rule.frequency === "weekly") {
    const weekdays = Array.from(
      new Set((rule.weekdays ?? []).filter((w) => Number.isInteger(w) && w >= 0 && w <= 6)),
    ).sort((a, b) => a - b);
    return {
      frequency: "weekly",
      interval: normalizeInterval(rule.interval),
      weekdays: weekdays.length > 0 ? weekdays : [1],
      start_date: startDate,
    };
  }
  if (rule.frequency === "monthly" && rule.mode === "day_of_month") {
    return {
      frequency: "monthly",
      interval: normalizeInterval(rule.interval),
      mode: "day_of_month",
      day: Math.min(31, Math.max(1, Math.floor(rule.day ?? 1))),
      start_date: startDate,
    };
  }
  if (rule.frequency === "monthly" && rule.mode === "nth_weekday") {
    const rawNth = rule.nth;
    const nth =
      rawNth === "last" || rawNth === "penultimate"
        ? rawNth
        : Math.min(5, Math.max(1, Math.floor(Number(rawNth) || 1)));
    return {
      frequency: "monthly",
      interval: normalizeInterval(rule.interval),
      mode: "nth_weekday",
      weekday: Math.min(6, Math.max(0, Math.floor(rule.weekday ?? 1))),
      nth,
      start_date: startDate,
    };
  }
  return {
    frequency: "yearly",
    interval: normalizeInterval((rule as Extract<PlannerRecurrenceRule, { frequency: "yearly" }>).interval),
    month: Math.min(
      12,
      Math.max(1, Math.floor((rule as Extract<PlannerRecurrenceRule, { frequency: "yearly" }>).month ?? 1)),
    ),
    day: Math.min(
      31,
      Math.max(1, Math.floor((rule as Extract<PlannerRecurrenceRule, { frequency: "yearly" }>).day ?? 1)),
    ),
    start_date: startDate,
  };
}

function weekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function monthDiff(anchor: Date, target: Date): number {
  return (target.getFullYear() - anchor.getFullYear()) * 12 + (target.getMonth() - anchor.getMonth());
}

function yearlyDiff(anchor: Date, target: Date): number {
  return target.getFullYear() - anchor.getFullYear();
}

function anchorDateForRule(rule: PlannerRecurrenceRule, targetIso: string): Date | null {
  if (!rule.start_date) return normalizeIsoDateLocal(targetIso);
  return normalizeIsoDateLocal(rule.start_date) ?? normalizeIsoDateLocal(targetIso);
}

export function isRecurrenceRuleDueOn(ruleInput: PlannerRecurrenceRule, isoDate: string): boolean {
  const rule = normalizeRecurrenceRule(ruleInput, undefined);
  const target = normalizeIsoDateLocal(isoDate);
  if (!target) return false;
  const anchor = anchorDateForRule(rule, isoDate);
  if (!anchor) return false;
  const interval = normalizeInterval(rule.interval);
  if (target < anchor) return false;

  if (rule.frequency === "daily") {
    const daysDiff = Math.floor((target.getTime() - anchor.getTime()) / 86400000);
    return daysDiff % interval === 0;
  }

  if (rule.frequency === "weekly") {
    if (!rule.weekdays.includes(target.getDay())) return false;
    const anchorWeekStart = new Date(anchor);
    anchorWeekStart.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    const targetWeekStart = new Date(target);
    targetWeekStart.setDate(target.getDate() - ((target.getDay() + 6) % 7));
    const weekDiff = Math.floor((targetWeekStart.getTime() - anchorWeekStart.getTime()) / (86400000 * 7));
    return weekDiff >= 0 && weekDiff % interval === 0;
  }

  if (rule.frequency === "monthly") {
    const diff = monthDiff(anchor, target);
    if (diff < 0 || diff % interval !== 0) return false;
    if (rule.mode === "day_of_month") {
      const expected = Math.min(rule.day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate());
      return target.getDate() === expected;
    }
    if (target.getDay() !== rule.weekday) return false;
    if (rule.nth === "last") {
      return target.getDate() === lastWeekdayOfMonth(target.getFullYear(), target.getMonth(), rule.weekday);
    }
    if (rule.nth === "penultimate") {
      return target.getDate() === penultimateWeekdayOfMonth(target.getFullYear(), target.getMonth(), rule.weekday);
    }
    return weekOfMonth(target) === rule.nth;
  }

  const yearGap = yearlyDiff(anchor, target);
  if (yearGap < 0 || yearGap % interval !== 0) return false;
  const expectedDay = Math.min(rule.day, new Date(target.getFullYear(), rule.month, 0).getDate());
  return target.getMonth() + 1 === rule.month && target.getDate() === expectedDay;
}

export function formatRecurrenceLabel(ruleInput: PlannerRecurrenceRule): string {
  const rule = normalizeRecurrenceRule(ruleInput, undefined);
  if (rule.frequency === "daily") return rule.interval > 1 ? `Alle ${rule.interval} Tage` : "Täglich";
  if (rule.frequency === "weekly") {
    const days = rule.weekdays.map((d) => WEEKDAY_LABELS[d].slice(0, 2)).join(", ");
    return rule.interval > 1 ? `Alle ${rule.interval} Wochen (${days})` : `Wöchentlich (${days})`;
  }
  if (rule.frequency === "monthly" && rule.mode === "day_of_month") {
    return `Monatlich am ${rule.day}.`;
  }
  if (rule.frequency === "monthly" && rule.mode === "nth_weekday") {
    if (rule.nth === "last") return `Monatlich am letzten ${WEEKDAY_LABELS[rule.weekday]}`;
    if (rule.nth === "penultimate") return `Monatlich am vorletzten ${WEEKDAY_LABELS[rule.weekday]}`;
    return `Monatlich am ${rule.nth}. ${WEEKDAY_LABELS[rule.weekday]}`;
  }
  return `Jährlich am ${String(rule.day).padStart(2, "0")}.${String(rule.month).padStart(2, "0")}.`;
}

export function findNextDueDate(
  ruleInput: PlannerRecurrenceRule,
  fromIso: string,
  maxDays = 366 * 3,
): string | null {
  const start = normalizeIsoDateLocal(fromIso);
  if (!start) return null;
  const rule = normalizeRecurrenceRule(ruleInput, undefined);
  for (let offset = 0; offset <= maxDays; offset += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + offset);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (isRecurrenceRuleDueOn(rule, iso)) return iso;
  }
  return null;
}

export function formatDueDateLabel(iso: string): string {
  const date = normalizeIsoDateLocal(iso);
  if (!date) return iso;
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

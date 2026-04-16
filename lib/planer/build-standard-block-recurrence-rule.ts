import type { PlannerRecurrenceRule } from "@/lib/planer/recurrence";

export type StandardBlockRecurrenceFormState = {
  frequency: PlannerRecurrenceRule["frequency"];
  interval: string;
  weeklyWeekdays: number[];
  monthlyMode: "day_of_month" | "nth_weekday";
  monthlyDay: string;
  monthlyNth: string;
  monthlyWeekday: string;
  yearlyMonth: string;
  yearlyDay: string;
};

export function buildRecurrenceRuleFromFormState(
  anchorIso: string,
  s: StandardBlockRecurrenceFormState,
): PlannerRecurrenceRule {
  const interval = Math.max(1, Math.floor(Number(s.interval) || 1));
  if (s.frequency === "daily") {
    return { frequency: "daily", interval, start_date: anchorIso };
  }
  if (s.frequency === "weekly") {
    const weekdays =
      s.weeklyWeekdays.length > 0 ? [...s.weeklyWeekdays].sort((a, b) => a - b) : [1];
    return { frequency: "weekly", interval, weekdays, start_date: anchorIso };
  }
  if (s.frequency === "monthly") {
    if (s.monthlyMode === "day_of_month") {
      return {
        frequency: "monthly",
        interval,
        mode: "day_of_month",
        day: Math.min(31, Math.max(1, Math.floor(Number(s.monthlyDay) || 1))),
        start_date: anchorIso,
      };
    }
    return {
      frequency: "monthly",
      interval,
      mode: "nth_weekday",
      nth:
        s.monthlyNth === "last" || s.monthlyNth === "penultimate"
          ? s.monthlyNth
          : Math.min(5, Math.max(1, Math.floor(Number(s.monthlyNth) || 1))),
      weekday: Math.min(6, Math.max(0, Math.floor(Number(s.monthlyWeekday) || 1))),
      start_date: anchorIso,
    };
  }
  return {
    frequency: "yearly",
    interval,
    month: Math.min(12, Math.max(1, Math.floor(Number(s.yearlyMonth) || 1))),
    day: Math.min(31, Math.max(1, Math.floor(Number(s.yearlyDay) || 1))),
    start_date: anchorIso,
  };
}

export function recurrenceFormStateFromRule(rule: PlannerRecurrenceRule): StandardBlockRecurrenceFormState {
  const interval = String(rule.interval ?? 1);
  if (rule.frequency === "daily") {
    return {
      frequency: "daily",
      interval,
      weeklyWeekdays: [1],
      monthlyMode: "day_of_month",
      monthlyDay: "15",
      monthlyNth: "3",
      monthlyWeekday: "2",
      yearlyMonth: "1",
      yearlyDay: "15",
    };
  }
  if (rule.frequency === "weekly") {
    return {
      frequency: "weekly",
      interval,
      weeklyWeekdays: [...rule.weekdays],
      monthlyMode: "day_of_month",
      monthlyDay: "15",
      monthlyNth: "3",
      monthlyWeekday: "2",
      yearlyMonth: "1",
      yearlyDay: "15",
    };
  }
  if (rule.frequency === "monthly") {
    if (rule.mode === "day_of_month") {
      return {
        frequency: "monthly",
        interval,
        weeklyWeekdays: [1],
        monthlyMode: "day_of_month",
        monthlyDay: String(rule.day),
        monthlyNth: "3",
        monthlyWeekday: "2",
        yearlyMonth: "1",
        yearlyDay: "15",
      };
    }
    return {
      frequency: "monthly",
      interval,
      weeklyWeekdays: [1],
      monthlyMode: "nth_weekday",
      monthlyDay: "15",
      monthlyNth:
        rule.nth === "last" || rule.nth === "penultimate" ? rule.nth : String(rule.nth),
      monthlyWeekday: String(rule.weekday),
      yearlyMonth: "1",
      yearlyDay: "15",
    };
  }
  return {
    frequency: "yearly",
    interval,
    weeklyWeekdays: [1],
    monthlyMode: "day_of_month",
    monthlyDay: "15",
    monthlyNth: "3",
    monthlyWeekday: "2",
    yearlyMonth: String(rule.month),
    yearlyDay: String(rule.day),
  };
}

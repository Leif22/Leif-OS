import { describe, expect, it } from "vitest";
import {
  findNextDueDate,
  formatRecurrenceLabel,
  isRecurrenceRuleDueOn,
  normalizeRecurrenceRule,
  type PlannerRecurrenceRule,
} from "./recurrence";

describe("planner recurrence rules", () => {
  it("matches monthly nth weekday (3rd Tuesday)", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      mode: "nth_weekday",
      weekday: 2,
      nth: 3,
      start_date: "2026-01-01",
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-04-21")).toBe(true);
    expect(isRecurrenceRuleDueOn(rule, "2026-04-14")).toBe(false);
  });

  it("matches monthly last weekday", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      mode: "nth_weekday",
      weekday: 5, // Friday
      nth: "last",
      start_date: "2026-01-01",
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-04-24")).toBe(true); // last Friday in April 2026
    expect(isRecurrenceRuleDueOn(rule, "2026-04-17")).toBe(false);
    expect(formatRecurrenceLabel(rule)).toContain("letzten");
  });

  it("matches monthly penultimate weekday", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      mode: "nth_weekday",
      weekday: 5, // Friday
      nth: "penultimate",
      start_date: "2026-01-01",
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-04-17")).toBe(true); // penultimate Friday in April 2026
    expect(isRecurrenceRuleDueOn(rule, "2026-04-24")).toBe(false);
    expect(formatRecurrenceLabel(rule)).toContain("vorletzten");
  });

  it("matches monthly day_of_month and clamps month ends", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      mode: "day_of_month",
      day: 31,
      start_date: "2026-01-01",
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-02-28")).toBe(true);
    expect(isRecurrenceRuleDueOn(rule, "2026-02-27")).toBe(false);
  });

  it("respects weekly interval and weekdays", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "weekly",
      interval: 2,
      weekdays: [1, 4],
      start_date: "2026-01-05", // Monday
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-01-08")).toBe(true); // same week Thursday
    expect(isRecurrenceRuleDueOn(rule, "2026-01-15")).toBe(false); // next week Thursday
    expect(isRecurrenceRuleDueOn(rule, "2026-01-19")).toBe(true); // +2 weeks Monday
  });

  it("supports yearly recurrence through year boundary", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "yearly",
      interval: 1,
      month: 1,
      day: 2,
      start_date: "2025-01-02",
    };
    expect(isRecurrenceRuleDueOn(rule, "2026-01-02")).toBe(true);
    expect(isRecurrenceRuleDueOn(rule, "2026-01-01")).toBe(false);
  });

  it("finds next due date from start iso", () => {
    const rule: PlannerRecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      mode: "nth_weekday",
      weekday: 5, // Friday
      nth: 1,
      start_date: "2026-01-01",
    };
    expect(findNextDueDate(rule, "2026-04-01")).toBe("2026-04-03");
  });

  it("normalizes legacy fallback and formats labels", () => {
    const normalized = normalizeRecurrenceRule(undefined, "werktags");
    expect(normalized.frequency).toBe("weekly");
    if (normalized.frequency === "weekly") {
      expect(normalized.weekdays).toEqual([1, 2, 3, 4, 5]);
    }
    expect(formatRecurrenceLabel(normalized)).toContain("Wöchentlich");
  });
});

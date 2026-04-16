"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, type PlannerRecurrenceRule } from "@/lib/planer/recurrence";
import type { StandardBlockRecurrenceFormState } from "@/lib/planer/build-standard-block-recurrence-rule";

type Props = {
  form: StandardBlockRecurrenceFormState;
  setFrequency: (v: PlannerRecurrenceRule["frequency"]) => void;
  setInterval: (v: string) => void;
  setWeeklyWeekdays: Dispatch<SetStateAction<number[]>>;
  setMonthlyMode: (v: "day_of_month" | "nth_weekday") => void;
  setMonthlyDay: (v: string) => void;
  setMonthlyNth: (v: string) => void;
  setMonthlyWeekday: (v: string) => void;
  setYearlyMonth: (v: string) => void;
  setYearlyDay: (v: string) => void;
};

export function StandardBlockRecurrenceFields({
  form,
  setFrequency,
  setInterval,
  setWeeklyWeekdays,
  setMonthlyMode,
  setMonthlyDay,
  setMonthlyNth,
  setMonthlyWeekday,
  setYearlyMonth,
  setYearlyDay,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-leif-secondary">Intervall</span>
          <input
            type="number"
            min={1}
            step={1}
            value={form.interval}
            onChange={(e) => setInterval(e.target.value)}
            className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-leif-secondary">Wiederholung</span>
          <select
            value={form.frequency}
            onChange={(e) => setFrequency(e.target.value as PlannerRecurrenceRule["frequency"])}
            className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
          >
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
          </select>
        </label>
      </div>
      {form.frequency === "weekly" ? (
        <div className="space-y-1 text-sm">
          <span className="font-medium text-leif-secondary">Wochentage</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, idx) => {
              const active = form.weeklyWeekdays.includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setWeeklyWeekdays((current) => {
                      if (current.includes(idx)) {
                        const next = current.filter((d) => d !== idx);
                        return next.length > 0 ? next : current;
                      }
                      return [...current, idx].sort((a, b) => a - b);
                    })
                  }
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-[#456990] bg-[rgba(69,105,144,0.08)] text-[#456990]"
                      : "border-slate-200 bg-white text-leif-secondary hover:border-slate-300 hover:text-leif-text",
                  )}
                >
                  {label.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {form.frequency === "monthly" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMonthlyMode("day_of_month")}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                form.monthlyMode === "day_of_month"
                  ? "border-[#456990] bg-[rgba(69,105,144,0.08)] text-[#456990]"
                  : "border-slate-200 bg-white text-leif-secondary hover:border-slate-300 hover:text-leif-text",
              )}
            >
              Am Tag
            </button>
            <button
              type="button"
              onClick={() => setMonthlyMode("nth_weekday")}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                form.monthlyMode === "nth_weekday"
                  ? "border-[#456990] bg-[rgba(69,105,144,0.08)] text-[#456990]"
                  : "border-slate-200 bg-white text-leif-secondary hover:border-slate-300 hover:text-leif-text",
              )}
            >
              Am n-ten Wochentag
            </button>
          </div>
          {form.monthlyMode === "day_of_month" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-leif-secondary">Tag des Monats</span>
              <input
                type="number"
                min={1}
                max={31}
                value={form.monthlyDay}
                onChange={(e) => setMonthlyDay(e.target.value)}
                className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">N-te Woche</span>
                <select
                  value={form.monthlyNth}
                  onChange={(e) => setMonthlyNth(e.target.value)}
                  className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
                >
                  <option value="1">1.</option>
                  <option value="2">2.</option>
                  <option value="3">3.</option>
                  <option value="4">4.</option>
                  <option value="5">5.</option>
                  <option value="last">Letzter</option>
                  <option value="penultimate">Vorletzter</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-leif-secondary">Wochentag</span>
                <select
                  value={form.monthlyWeekday}
                  onChange={(e) => setMonthlyWeekday(e.target.value)}
                  className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
                >
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <option key={label} value={String(idx)}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      ) : null}
      {form.frequency === "yearly" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-leif-secondary">Monat</span>
            <input
              type="number"
              min={1}
              max={12}
              value={form.yearlyMonth}
              onChange={(e) => setYearlyMonth(e.target.value)}
              className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-leif-secondary">Tag</span>
            <input
              type="number"
              min={1}
              max={31}
              value={form.yearlyDay}
              onChange={(e) => setYearlyDay(e.target.value)}
              className="rounded-md border border-leif-border bg-leif-surface px-2.5 py-2 text-sm text-leif-text outline-none ring-leif-primary focus:ring-2"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}

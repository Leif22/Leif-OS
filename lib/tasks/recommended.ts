import type { TaskPriority, TaskWithRelations } from "./types";
import { PRIORITY_ORDER } from "./types";

/** Kalendertag für „heute“ (z. B. Fälligkeit / geplanter Tag), konsistent mit Nutzerzeitzone. */
export const RECOMMENDATION_TIMEZONE = "Europe/Berlin";

export function todayYmdInRecommendationTz(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RECOMMENDATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function calendarDaysBetweenDueAndToday(dueYmd: string, todayYmd: string): number {
  const [y, m, d] = dueYmd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const due = Date.UTC(y, m - 1, d);
  const today = Date.UTC(ty, tm - 1, td);
  return Math.round((due - today) / 86_400_000);
}

/**
 * Fälligkeitsdruck 0…1 (V1): Überfällig = 1; heute 0,9; morgen 0,7; …; >14 Tage oder kein Datum = 0.
 * Zwischen den Stützpunkten linear.
 */
export function duePressureNormalized(diffDays: number): number {
  if (diffDays < 0) return 1;
  if (diffDays <= 1) return 0.9 - 0.2 * diffDays;
  if (diffDays <= 3) return 0.7 + (0.5 - 0.7) * ((diffDays - 1) / 2);
  if (diffDays <= 7) return 0.5 + (0.2 - 0.5) * ((diffDays - 3) / 4);
  if (diffDays <= 14) return 0.2 + (0 - 0.2) * ((diffDays - 7) / 7);
  return 0;
}

export function priorityNormalized(p: TaskPriority): number {
  if (p === "high") return 1;
  if (p === "normal") return 0.5;
  return 0.1;
}

export function ageDaysSince(createdAtIso: string): number {
  const created = new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
}

export function ageNormalized(createdAtIso: string): number {
  return Math.min(ageDaysSince(createdAtIso) / 30, 1);
}

export type RecommendationBreakdown = {
  /** Gesamtscore (Summe der gewichteten Teilscores) */
  score: number;
  score_priority: number;
  score_due: number;
  score_today: number;
  score_age: number;
};

const W_P = 0.4;
const W_D = 0.3;
const W_T = 0.2;
const W_A = 0.1;

export function computeRecommendationBreakdown(
  task: TaskWithRelations,
  todayYmd: string,
): RecommendationBreakdown {
  const pNorm = priorityNormalized(task.priority);
  const diff = task.due_date
    ? calendarDaysBetweenDueAndToday(task.due_date, todayYmd)
    : 9999;
  const dNorm = task.due_date ? duePressureNormalized(diff) : 0;
  const tNorm = task.planned_date === todayYmd ? 1 : 0;
  const aNorm = ageNormalized(task.created_at);

  const score_priority = W_P * pNorm;
  const score_due = W_D * dNorm;
  const score_today = W_T * tNorm;
  const score_age = W_A * aNorm;

  return {
    score: score_priority + score_due + score_today + score_age,
    score_priority,
    score_due,
    score_today,
    score_age,
  };
}

const SCORE_EPS = 1e-9;

function tieBreak(a: TaskWithRelations, b: TaskWithRelations, todayYmd: string): number {
  const pa = PRIORITY_ORDER[a.priority];
  const pb = PRIORITY_ORDER[b.priority];
  if (pa !== pb) return pa - pb;

  const da = a.due_date ? calendarDaysBetweenDueAndToday(a.due_date, todayYmd) : 10_000;
  const db = b.due_date ? calendarDaysBetweenDueAndToday(b.due_date, todayYmd) : 10_000;
  if (da !== db) return da - db;

  return ageDaysSince(b.created_at) - ageDaysSince(a.created_at);
}

export function pickRecommendedTask(
  tasks: TaskWithRelations[],
  todayYmd: string,
): { task: TaskWithRelations; breakdown: RecommendationBreakdown } | null {
  const candidates = tasks.filter((t) => t.status !== "erledigt");
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestBreakdown = computeRecommendationBreakdown(best, todayYmd);
  let bestScore = bestBreakdown.score;

  for (let i = 1; i < candidates.length; i++) {
    const t = candidates[i];
    const br = computeRecommendationBreakdown(t, todayYmd);
    if (br.score > bestScore + SCORE_EPS) {
      best = t;
      bestBreakdown = br;
      bestScore = br.score;
    } else if (Math.abs(br.score - bestScore) <= SCORE_EPS) {
      if (tieBreak(t, best, todayYmd) < 0) {
        best = t;
        bestBreakdown = br;
        bestScore = br.score;
      }
    }
  }

  return { task: best, breakdown: bestBreakdown };
}

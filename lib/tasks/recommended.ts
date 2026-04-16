import type { TaskWithRelations } from "./types";

/** Kalendertag für „heute“ (z. B. Fälligkeit / geplanter Tag), konsistent mit Nutzerzeitzone. */
export const RECOMMENDATION_TIMEZONE = "Europe/Berlin";

/** Task-Schlüssel, die als Fokusarbeit gelten (optionaler Morgen-Boost). */
const FOCUS_TASK_TYPE_KEYS = new Set(["deep"]);

const MORNING_FOCUS_BOOST = 15;
/** Inkl. 5, exkl. 12 → Stunden 5–11. */
const MORNING_FOCUS_START_HOUR = 5;
const MORNING_FOCUS_END_HOUR = 12;

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

export function berlinHourLocal(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RECOMMENDATION_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value;
  return h ? parseInt(h, 10) : 12;
}

function effectiveDueYmd(task: TaskWithRelations): string | null {
  const p = task.planned_date?.trim();
  const d = task.due_date?.trim();
  return (p || d || null) as string | null;
}

function duePointsAndHints(
  task: TaskWithRelations,
  todayYmd: string,
): { points: number; hints: string[] } {
  const ymd = effectiveDueYmd(task);
  if (!ymd) {
    return { points: 5, hints: [] };
  }
  const diff = calendarDaysBetweenDueAndToday(ymd, todayYmd);
  if (diff < 0) return { points: 100, hints: ["überfällig"] };
  if (diff === 0) return { points: 80, hints: ["heute fällig"] };
  if (diff === 1) return { points: 50, hints: ["morgen fällig"] };
  return { points: 20, hints: ["Termin liegt in der Zukunft"] };
}

function durationPointsAndHints(minutes: number | null | undefined): { points: number; hints: string[] } {
  if (minutes == null || minutes <= 0) {
    return { points: 0, hints: [] };
  }
  if (minutes < 15) return { points: 30, hints: ["kurze Dauer"] };
  if (minutes <= 60) return { points: 20, hints: ["überschaubare Dauer"] };
  return { points: 5, hints: [] };
}

function dataQualityPoints(task: TaskWithRelations): { points: number } {
  let p = 0;
  const min = task.estimated_minutes;
  if (min == null || min <= 0) p -= 20;
  if (!task.task_type?.trim()) p -= 10;
  return { points: p };
}

function contextPoints(task: TaskWithRelations, now: Date): { points: number; hints: string[] } {
  const raw = task.task_type?.trim() ?? "";
  if (!raw || !FOCUS_TASK_TYPE_KEYS.has(raw)) return { points: 0, hints: [] };
  const h = berlinHourLocal(now);
  if (h < MORNING_FOCUS_START_HOUR || h >= MORNING_FOCUS_END_HOUR) return { points: 0, hints: [] };
  return { points: MORNING_FOCUS_BOOST, hints: ["Fokus passt zum Vormittag"] };
}

function buildReasons(
  dueHints: string[],
  durHints: string[],
  dq: number,
  ctxHints: string[],
  hasArt: boolean,
  hasDuration: boolean,
): string[] {
  const out: string[] = [...dueHints, ...durHints, ...ctxHints];
  if (dq === 0 && hasArt && hasDuration) {
    out.push("klare Einordnung");
  }
  return [...new Set(out.filter(Boolean))];
}

export type RecommendationBreakdown = {
  /** Gesamtscore (regelbasiert) */
  score: number;
  score_due: number;
  score_duration: number;
  score_data_quality: number;
  score_context: number;
  /** Kurze Texte für „Empfohlen, weil …“ */
  reasons: string[];
};

/** Mappt die neue Aufschlüsselung auf die Legacy-Spalten in `recommendation_log`. */
export function breakdownForRecommendationLog(b: RecommendationBreakdown): {
  score: number;
  score_priority: number;
  score_due: number;
  score_today: number;
  score_age: number;
} {
  return {
    score: b.score,
    score_priority: b.score_context,
    score_due: b.score_due,
    score_today: b.score_duration,
    score_age: b.score_data_quality,
  };
}

export function computeRecommendationBreakdown(
  task: TaskWithRelations,
  todayYmd: string,
  now: Date = new Date(),
): RecommendationBreakdown {
  const { points: duePts, hints: dueHints } = duePointsAndHints(task, todayYmd);
  const { points: durPts, hints: durHints } = durationPointsAndHints(task.estimated_minutes);
  const { points: dq } = dataQualityPoints(task);
  const { points: ctxPts, hints: ctxHints } = contextPoints(task, now);

  const hasArt = Boolean(task.task_type?.trim());
  const hasDuration = task.estimated_minutes != null && task.estimated_minutes > 0;
  const reasons = buildReasons(dueHints, durHints, dq, ctxHints, hasArt, hasDuration);

  const score = duePts + durPts + dq + ctxPts;

  return {
    score,
    score_due: duePts,
    score_duration: durPts,
    score_data_quality: dq,
    score_context: ctxPts,
    reasons,
  };
}

/** Frühere Fälligkeit = kleineres YYYY-MM-DD; ohne Datum sortiert nach hinten. */
function dueSortKey(task: TaskWithRelations): string {
  return effectiveDueYmd(task) ?? "9999-12-31";
}

/** Kürzere Dauer gewinnt; fehlende Dauer nach hinten. */
function durationSortKey(task: TaskWithRelations): number {
  const m = task.estimated_minutes;
  if (m == null || m <= 0) return 999_999;
  return m;
}

function compareRanked(
  a: { task: TaskWithRelations; breakdown: RecommendationBreakdown },
  b: { task: TaskWithRelations; breakdown: RecommendationBreakdown },
): number {
  const ds = b.breakdown.score - a.breakdown.score;
  if (ds !== 0) return ds;

  const dueA = dueSortKey(a.task);
  const dueB = dueSortKey(b.task);
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;

  const durA = durationSortKey(a.task);
  const durB = durationSortKey(b.task);
  if (durA !== durB) return durA - durB;

  return a.task.id.localeCompare(b.task.id);
}

export function pickRecommendedTask(
  tasks: TaskWithRelations[],
  todayYmd: string,
  excludeTaskIds?: ReadonlySet<string>,
  now: Date = new Date(),
): { task: TaskWithRelations; breakdown: RecommendationBreakdown } | null {
  const candidates = tasks.filter(
    (t) => t.status !== "erledigt" && !(excludeTaskIds?.has(t.id)),
  );
  if (candidates.length === 0) return null;

  const scored = candidates.map((task) => ({
    task,
    breakdown: computeRecommendationBreakdown(task, todayYmd, now),
  }));

  scored.sort(compareRanked);

  return { task: scored[0].task, breakdown: scored[0].breakdown };
}

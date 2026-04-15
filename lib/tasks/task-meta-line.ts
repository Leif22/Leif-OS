import { addBerlinCalendarDays } from "@/lib/calendar/berlin-ymd";
import type { TaskWithRelations } from "@/lib/tasks/types";

/** Kalendertage Berlin: Differenz von `todayYmd` zu `targetYmd` (positiv = Zukunft). */
function signedCalendarDaysFromTodayTo(todayYmd: string, targetYmd: string): number {
  if (todayYmd === targetYmd) return 0;
  const step = targetYmd > todayYmd ? 1 : -1;
  let cur = todayYmd;
  let n = 0;
  const maxSteps = 4000;
  while (cur !== targetYmd && Math.abs(n) < maxSteps) {
    cur = addBerlinCalendarDays(cur, step);
    n += step;
  }
  return n;
}

/** Fälligkeit als „Heute“ / „Morgen“ / „in n Tagen“ / „vor n Tagen“. */
function relativeDueLabel(targetYmd: string, todayYmd: string): string {
  const d = signedCalendarDaysFromTodayTo(todayYmd, targetYmd);
  if (d === 0) return "Heute";
  if (d === 1) return "Morgen";
  if (d > 1) return `in ${d} Tagen`;
  if (d === -1) return "vor 1 Tag";
  return `vor ${-d} Tagen`;
}

/**
 * Liste: bei vollständigen Daten `Art · Dauer · Fälligkeit`
 * (Fälligkeit relativ in Tagen, außer Heute/Morgen).
 * Bei Lücken nur **ein** kurzer Hinweis.
 */
export function formatTaskMetaLine(
  task: TaskWithRelations,
  typeLabel: string,
  todayYmd: string,
): string {
  const hasArt = Boolean(typeLabel && typeLabel !== "—");
  const hasMin = task.estimated_minutes != null && task.estimated_minutes > 0;
  const planned = task.planned_date;
  const due = task.due_date;
  const dateIso = planned ?? due ?? null;
  const hasDate = dateIso != null;

  if (hasArt && hasMin && hasDate) {
    const art = typeLabel;
    const dauer = `${task.estimated_minutes} min`;
    const fälligkeit = relativeDueLabel(dateIso, todayYmd);
    return [art, dauer, fälligkeit].join(" · ");
  }

  if (!hasMin) return "Dauer fehlt";
  if (!hasDate) return "Termin fehlt";
  return "Art fehlt";
}

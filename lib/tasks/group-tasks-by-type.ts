import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { TaskWithRelations } from "@/lib/tasks/types";

export type TaskTypeGroup = {
  key: string;
  label: string;
  items: TaskWithRelations[];
};

/** Gleiche Sortierung wie bei der Gruppierung (Einstellungen → sort_order). */
export function taskTypesSortedForGrouping(taskTypes: TaskTypeRow[]): TaskTypeRow[] {
  return [...taskTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Anzeigenamen der konfigurierten Arten in Gruppierreihenfolge (ohne „Ohne Art“). */
export function orderedTaskTypeGroupLabels(taskTypes: TaskTypeRow[]): string[] {
  return taskTypesSortedForGrouping(taskTypes).map((t) => String(t.label ?? t.key).trim() || t.key);
}

function labelForTypeKey(key: string, taskTypes: TaskTypeRow[]): string {
  if (!key || key === "__none__") return "Ohne Art";
  return taskTypes.find((t) => t.key === key)?.label ?? key;
}

/**
 * Gruppiert Tasks nach `task_type` (Reihenfolge wie in `taskTypes`), zuletzt „Ohne Art“.
 * Reihenfolge innerhalb einer Gruppe = Reihenfolge in `items`.
 */
export function buildTaskTypeGroups(
  items: TaskWithRelations[],
  taskTypes: TaskTypeRow[],
): TaskTypeGroup[] {
  const byKey = new Map<string, TaskWithRelations[]>();
  const firstSeen: string[] = [];

  for (const t of items) {
    const raw = t.task_type?.trim();
    const k = raw ? String(raw) : "";
    if (!byKey.has(k)) {
      byKey.set(k, []);
      firstSeen.push(k);
    }
    byKey.get(k)!.push(t);
  }

  const out: TaskTypeGroup[] = [];
  const used = new Set<string>();

  for (const tt of taskTypesSortedForGrouping(taskTypes)) {
    const arr = byKey.get(tt.key);
    if (arr?.length) {
      out.push({ key: tt.key, label: tt.label, items: arr });
      used.add(tt.key);
    }
  }

  for (const k of firstSeen) {
    if (!k || used.has(k)) continue;
    const arr = byKey.get(k);
    if (arr?.length) {
      out.push({ key: k, label: labelForTypeKey(k, taskTypes), items: arr });
      used.add(k);
    }
  }

  const ohne = byKey.get("");
  if (ohne?.length) {
    out.push({ key: "__none__", label: "Ohne Art", items: ohne });
  }

  return out;
}

/** Kompakte Meta-Zeile: Anzahl · Gesamtdauer */
export function taskTypeGroupMetaLine(items: TaskWithRelations[]): string {
  const n = items.length;
  if (n === 0) return "";
  const totalMin = items.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
  const dur = totalMin > 0 ? `${totalMin} min` : "—";
  const countLabel = n === 1 ? "1 Aufgabe" : `${n} Aufgaben`;
  return `${countLabel} · ${dur}`;
}

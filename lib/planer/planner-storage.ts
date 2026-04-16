/**
 * Planer-Entwurf (Tagespläne) im Browser — gleiches Format wie `PlanerPageClient`.
 */

export const PLANER_STORAGE_KEY = "leif-os.planer.v1";

export type PlannerTaskPlacement = {
  taskId: string;
  startSlot: number;
  slotCount: number;
};

export type PlannerStorageSnapshot = {
  dayPlans: Record<string, PlannerTaskPlacement[]>;
  finalizedByDay: Record<string, boolean>;
};

export function readPlannerStorage(): PlannerStorageSnapshot {
  if (typeof window === "undefined") {
    return { dayPlans: {}, finalizedByDay: {} };
  }
  try {
    const raw = window.localStorage.getItem(PLANER_STORAGE_KEY);
    if (!raw) return { dayPlans: {}, finalizedByDay: {} };
    const parsed = JSON.parse(raw) as {
      dayPlans?: Record<string, PlannerTaskPlacement[]>;
      finalizedByDay?: Record<string, boolean>;
    };
    return {
      dayPlans: parsed.dayPlans ?? {},
      finalizedByDay: parsed.finalizedByDay ?? {},
    };
  } catch {
    return { dayPlans: {}, finalizedByDay: {} };
  }
}

/**
 * Task-IDs, die an einem Tag im Planer-Entwurf stehen (nicht finalisierter Tag).
 * Standard-Blöcke können dieselbe Struktur nutzen — Aufrufer filtert gegen echte Task-IDs.
 */
export function taskIdsInOpenPlannerDrafts(snapshot: PlannerStorageSnapshot = readPlannerStorage()): Set<string> {
  const ids = new Set<string>();
  for (const [day, placements] of Object.entries(snapshot.dayPlans)) {
    if (snapshot.finalizedByDay[day]) continue;
    for (const p of placements ?? []) {
      const id = p?.taskId?.trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

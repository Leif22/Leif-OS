"use client";

import { PLANER_STORAGE_KEY, readPlannerStorage, taskIdsInOpenPlannerDrafts } from "@/lib/planer/planner-storage";
import { useEffect, useState } from "react";

/**
 * IDs von Tasks, die im Planer auf einem noch nicht finalisierten Tag platziert sind.
 * Aktualisiert bei Tab-Wechsel, Fokus, Storage-Events (anderer Tab) und kurzem Intervall (gleicher Tab).
 */
export function usePlanerDraftTaskIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => taskIdsInOpenPlannerDrafts(readPlannerStorage()));

  useEffect(() => {
    const refresh = () => {
      setIds(taskIdsInOpenPlannerDrafts(readPlannerStorage()));
    };

    refresh();
    const interval = window.setInterval(refresh, 1200);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => {
      refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLANER_STORAGE_KEY || e.key === null) refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return ids;
}

"use client";

import { InboxAutoRefresh } from "@/components/inbox/inbox-auto-refresh";
import { InboxPendingTableWithWorkflows } from "@/components/inbox/inbox-pending-table-workflows";
import { AlertBanner } from "@/components/ui/alert-banner";
import { dashboardInboxItemToFull } from "@/lib/inbox/dashboard-to-full-item";
import type { DashboardInboxItem } from "@/lib/inbox/types";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { AreaRow } from "@/lib/tasks/types";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  userId: string;
  items: DashboardInboxItem[];
  progress: { todayTotal: number; todayDone: number };
  areas: AreaRow[];
  taskTypes: TaskTypeRow[];
  loadError: string | null;
  areasLoadError?: string | null;
  openCount?: number;
};

export function DashboardInboxClient({
  userId,
  items,
  progress,
  areas,
  taskTypes,
  loadError,
  areasLoadError = null,
  openCount,
}: Props) {
  const showBadge = openCount != null && openCount > 0 && !loadError;
  const pending = items.map(dashboardInboxItemToFull);
  const progressPct = progress.todayTotal > 0 ? Math.max(0, Math.min(100, Math.round((progress.todayDone / progress.todayTotal) * 100))) : 0;
  const [counterAnim, setCounterAnim] = useState(false);
  useEffect(() => {
    setCounterAnim(true);
    const t = window.setTimeout(() => setCounterAnim(false), 150);
    return () => window.clearTimeout(t);
  }, [openCount]);

  const combinedError = loadError ?? areasLoadError;

  return (
    <section
      className="space-y-3 rounded-xl border border-leif-border/28 bg-leif-surface-soft px-3 pb-4 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5 lg:px-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]"
      aria-labelledby="dashboard-inbox-heading"
    >
      <InboxAutoRefresh userId={userId} />
      <div className="flex flex-wrap items-end gap-2.5">
        <h2
          id="dashboard-inbox-heading"
          className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-leif-text sm:text-[26px]"
        >
          {PRODUCT_LABEL.inbox}
        </h2>
        {showBadge ? (
          <span
            className={`inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-leif-success/12 px-2.5 text-sm font-medium tabular-nums text-leif-success transition-all duration-150 ${counterAnim ? "-translate-y-0.5 opacity-90" : "translate-y-0 opacity-100"}`}
            aria-label={`${openCount} offen`}
          >
            {openCount}
          </span>
        ) : null}
        {!loadError && openCount === 0 ? (
          <span className="text-sm font-normal text-leif-muted">· erledigt</span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <p className="text-[12px] text-leif-secondary">
          Heute erledigt: <span className="font-medium text-leif-text">{progress.todayDone}</span> von{" "}
          <span className="font-medium text-leif-text">{progress.todayTotal}</span>
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-leif-surface-soft/90">
          <div
            className="h-full rounded-full bg-leif-primary transition-[width] duration-200 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {combinedError ? (
        <AlertBanner variant="error">Inbox konnte nicht geladen werden: {combinedError}</AlertBanner>
      ) : null}

      {!combinedError && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leif-border/90 bg-leif-canvas/40 px-6 py-12 text-center">
          <Inbox className="mx-auto size-11 text-leif-muted" aria-hidden />
          <p className="mt-4 text-base font-medium text-leif-text">Nichts Offenes</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-leif-secondary">
            Keine offenen Inbox-Einträge — alles verarbeitet oder noch nichts eingegangen.
          </p>
        </div>
      ) : null}

      {!combinedError && items.length > 0 ? (
        <InboxPendingTableWithWorkflows
          pending={pending}
          areas={areas}
          taskTypes={taskTypes}
          loadError={null}
          heading={null}
          variant="dashboard"
          stayOnPageAfterSparring
        />
      ) : null}
    </section>
  );
}

"use client";

import { InboxPendingTableWithWorkflows } from "@/components/inbox/inbox-pending-table-workflows";
import { PageHeader } from "@/components/ui/page-header";
import { parseInboxAiSuggestion } from "@/lib/inbox/ai-suggestions";
import type { InboxListItem } from "@/lib/inbox/types";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/client";
import type { TaskTypeRow } from "@/lib/task-types/defaults";
import type { AreaRow } from "@/lib/tasks/types";
import { useEffect, useMemo, useState } from "react";

type Props = {
  userId: string;
  pending: InboxListItem[];
  closed: InboxListItem[];
  areas: AreaRow[];
  taskTypes: TaskTypeRow[];
  errors: { pending: string | null; closed: string | null };
};

export function InboxPageClient({ userId, pending, closed, areas, taskTypes, errors }: Props) {
  const [clockMs, setClockMs] = useState<number>(() => Date.now());
  const [pendingState, setPendingState] = useState<InboxListItem[]>(pending);
  const [closedState, setClosedState] = useState<InboxListItem[]>(closed);

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setPendingState(pending);
  }, [pending]);

  useEffect(() => {
    setClosedState(closed);
  }, [closed]);

  const upsertByUpdatedAtDesc = useMemo(
    () => (list: InboxListItem[], item: InboxListItem) => {
      const next = list.filter((x) => x.id !== item.id);
      next.push(item);
      next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return next;
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    const normalize = (row: Record<string, unknown>): InboxListItem => {
      const statusRaw = String(row.status ?? "pending");
      const status: InboxListItem["status"] =
        statusRaw === "pending" || statusRaw === "processed" || statusRaw === "discarded"
          ? statusRaw
          : "pending";
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const aiStatusRaw = String(row.ai_status ?? "");
      const aiStatus: InboxListItem["ai_status"] =
        aiStatusRaw === "pending" || aiStatusRaw === "ready" || aiStatusRaw === "rejected" || aiStatusRaw === "failed"
          ? aiStatusRaw
          : undefined;
      const aiSuggestion = parseInboxAiSuggestion(row.ai_suggestion) ?? parseInboxAiSuggestion(metadata.ai_suggestion_v1);
      return {
        id: String(row.id ?? ""),
        content: String(row.content ?? ""),
        source: String(row.source ?? ""),
        source_ref: row.source_ref == null ? null : String(row.source_ref),
        status,
        processed_as: row.processed_as == null ? null : String(row.processed_as),
        processed_ref_id: row.processed_ref_id == null ? null : String(row.processed_ref_id),
        metadata,
        ai_status: aiStatus,
        ai_error: row.ai_error == null ? null : String(row.ai_error),
        ai_suggestion: aiStatus === "rejected" ? null : aiSuggestion,
        ai_suggestion_rejected:
          aiStatus === "rejected" ||
          (typeof metadata.ai_suggestion_rejected_at === "string" && metadata.ai_suggestion_rejected_at.trim().length > 0),
        ai_suggestion_checked:
          aiStatus === "ready" ||
          aiStatus === "failed" ||
          aiStatus === "rejected" ||
          (typeof row.ai_checked_at === "string" && row.ai_checked_at.trim().length > 0),
        created_at: String(row.created_at ?? ""),
        updated_at: String(row.updated_at ?? ""),
      };
    };

    const channel = supabase
      .channel(`inbox_items_live:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbox_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextRow =
            payload.eventType === "DELETE"
              ? null
              : normalize(payload.new as Record<string, unknown>);
          const deletedId = String((payload.old as { id?: string } | null)?.id ?? "");

          if (payload.eventType === "DELETE") {
            if (!deletedId) return;
            setPendingState((current) => current.filter((x) => x.id !== deletedId));
            setClosedState((current) => current.filter((x) => x.id !== deletedId));
            return;
          }

          if (!nextRow) return;
          setPendingState((current) => {
            const without = current.filter((x) => x.id !== nextRow.id);
            return nextRow.status === "pending" ? upsertByUpdatedAtDesc(without, nextRow) : without;
          });
          setClosedState((current) => {
            const without = current.filter((x) => x.id !== nextRow.id);
            return nextRow.status === "processed" || nextRow.status === "discarded"
              ? upsertByUpdatedAtDesc(without, nextRow)
              : without;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, upsertByUpdatedAtDesc]);

  const now = clockMs;
  const todayKey = new Date(clockMs).toDateString();
  const todayProcessed = closedState.filter(
    (item) => item.status === "processed" && new Date(item.updated_at).toDateString() === todayKey,
  );
  const todayIncoming = pendingState.filter((item) => new Date(item.created_at).toDateString() === todayKey).length;
  const todayTotal = todayProcessed.length + todayIncoming;
  const progressPct = todayTotal > 0 ? Math.max(0, Math.min(100, Math.round((todayProcessed.length / todayTotal) * 100))) : 0;
  const oldestPendingTs = pendingState
    .map((item) => new Date(item.created_at).getTime())
    .filter((ts) => Number.isFinite(ts))
    .sort((a, b) => a - b)[0];
  const oldestCompact = (() => {
    if (!oldestPendingTs) return "—";
    const diffHours = Math.floor((now - oldestPendingTs) / (1000 * 60 * 60));
    if (diffHours < 24) return `${Math.max(0, diffHours)}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  })();
  const createdTodayTask = closedState.filter(
    (item) => item.processed_as === "task" && new Date(item.updated_at).toDateString() === todayKey,
  ).length;

  const processedAll = closedState
    .filter((item) => item.status === "processed")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const recentCompleted = processedAll.slice(0, 10);
  const completedTotalCount = processedAll.length;
  const discarded = closedState.filter((item) => item.status === "discarded");

  return (
    <div className="space-y-8">
      <div className="space-y-2.5">
        <PageHeader title={PRODUCT_LABEL.inbox} />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[12px] text-leif-muted">
            <p className="font-medium text-leif-text">Heute erledigt</p>
            <p className="tabular-nums font-medium text-leif-text">
              {todayProcessed.length} / {todayTotal}
            </p>
          </div>
          <div className="h-[6px] overflow-hidden rounded-full bg-[#e5e7eb]">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: "#456990" }}
            />
          </div>
          <p className="text-[13px] font-medium leading-snug tracking-tight text-[#374151]">
            {pendingState.length} offen · ältestes: {oldestCompact}
          </p>
          <p className="text-[11px] leading-relaxed text-[#9ca3af]">
            Heute erstellt: {createdTodayTask} Tasks
          </p>
        </div>
      </div>

      <InboxPendingTableWithWorkflows
        pending={pendingState}
        areas={areas}
        taskTypes={taskTypes}
        loadError={errors.pending}
        recentCompleted={recentCompleted}
        completedTotalCount={completedTotalCount}
        discarded={discarded}
        closedLoadError={errors.closed}
      />
    </div>
  );
}

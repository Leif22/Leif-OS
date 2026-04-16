import { KalenderPageClient } from "@/components/kalender/kalender-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { addBerlinCalendarDays, mondayOfIsoWeekBerlin } from "@/lib/calendar/berlin-ymd";
import {
  fetchCalendarEventsForBerlinYmdRange,
  fetchPlannedTasksForBerlinYmdRange,
} from "@/lib/calendar/fetch-range";
import type { KalenderView } from "@/lib/calendar/types";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { todayYmdInRecommendationTz } from "@/lib/tasks/recommended";
import { fetchPlannerStandardBlocksForUser } from "@/lib/planer/fetch-planner-standard-blocks";
import { fetchTasksPageData } from "@/lib/tasks/fetch-tasks";
import { taskIsBookedInCalendar, type AreaRow, type TaskWithRelations } from "@/lib/tasks/types";
import Link from "next/link";

type KalenderPageProps = {
  searchParams: Promise<{
    m?: string;
    v?: string;
    d?: string;
    plan?: string;
    outlook_connected?: string;
    outlook_error?: string;
    outlook_disconnected?: string;
  }>;
};

export default async function KalenderPage({ searchParams }: KalenderPageProps) {
  const sp = await searchParams;
  const rawPlan = typeof sp.plan === "string" ? sp.plan.trim().toLowerCase() : "";
  const calendarWorkMode: "anzeigen" | "planen" = rawPlan === "planen" ? "planen" : "anzeigen";
  const rawV = typeof sp.v === "string" ? sp.v.trim().toLowerCase() : "";
  const view: KalenderView =
    rawV === "week" || rawV === "day" || rawV === "agenda" ? (rawV as KalenderView) : "month";

  const todayYmd = todayYmdInRecommendationTz();
  const defaultYm = todayYmd.slice(0, 7);
  const rawM = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m.trim()) ? sp.m.trim() : defaultYm;
  const rawD =
    typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d.trim()) ? sp.d.trim() : todayYmd;

  const monthYmQuery = rawM;
  const anchorD =
    view === "month"
      ? todayYmd.startsWith(monthYmQuery)
        ? todayYmd
        : `${monthYmQuery}-01`
      : rawD;

  let rangeFrom: string;
  let rangeTo: string;

  if (view === "month") {
    const y = Number(monthYmQuery.slice(0, 4));
    const mo = Number(monthYmQuery.slice(5, 7));
    const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    rangeFrom = `${monthYmQuery}-01`;
    rangeTo = `${monthYmQuery}-${String(lastDay).padStart(2, "0")}`;
  } else if (view === "week") {
    const mon = mondayOfIsoWeekBerlin(anchorD);
    rangeFrom = mon;
    rangeTo = addBerlinCalendarDays(mon, 6);
  } else if (view === "agenda") {
    rangeFrom = anchorD;
    rangeTo = addBerlinCalendarDays(anchorD, 21);
  } else {
    rangeFrom = anchorD;
    rangeTo = anchorD;
  }

  const monthYm = view === "month" ? monthYmQuery : rangeFrom.slice(0, 7);
  const outlookSyncYm = view === "month" ? monthYmQuery : anchorD.slice(0, 7);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.kalender} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [{ events, error: evErr }, { tasks: plannedTasks, error: taskErr }, msTok] =
    await Promise.all([
      fetchCalendarEventsForBerlinYmdRange(supabase, user.id, rangeFrom, rangeTo),
      fetchPlannedTasksForBerlinYmdRange(supabase, user.id, rangeFrom, rangeTo),
      supabase.from("microsoft_oauth_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);

  let plannerBundle: {
    initialTasks: { id: string; title: string; durationMinutes: number; priority: number; relevance: number }[];
    initialStandardBlocks: Awaited<ReturnType<typeof fetchPlannerStandardBlocksForUser>>["blocks"];
    standardBlocksLoadError: string | null;
    editableTasks: TaskWithRelations[];
    taskAreas: AreaRow[];
    loadError: string | null;
  } | null = null;

  if (calendarWorkMode === "planen") {
    const [tasksRes, stdRes] = await Promise.all([
      fetchTasksPageData(supabase),
      fetchPlannerStandardBlocksForUser(supabase, user.id),
    ]);
    plannerBundle = {
      loadError: tasksRes.loadError,
      editableTasks: tasksRes.tasks,
      taskAreas: tasksRes.areas,
      initialStandardBlocks: stdRes.blocks,
      standardBlocksLoadError: stdRes.error,
      initialTasks: tasksRes.tasks
        .filter(
          (task) =>
            !task.completed_at &&
            !taskIsBookedInCalendar({
              completed_at: task.completed_at,
              planned_date: task.planned_date,
              status: task.raw_status,
            }),
        )
        .map((task) => ({
          id: task.id,
          title: task.title,
          durationMinutes: task.estimated_minutes ?? 45,
          priority: task.priority === "high" ? 1 : task.priority === "normal" ? 2 : 3,
          relevance: task.priority === "high" ? 9 : task.priority === "normal" ? 7 : 5,
        })),
    };
  }

  const loadError = evErr ?? taskErr ?? null;

  const outlookLinked = Boolean(msTok.data);
  const outlookFlash =
    typeof sp.outlook_error === "string" && sp.outlook_error.trim()
      ? ({ kind: "error" as const, message: sp.outlook_error.trim() })
      : sp.outlook_connected === "1"
        ? ({
            kind: "success" as const,
            message:
              "Outlook wurde verbunden. Du kannst Termine direkt in deinen Outlook-Kalender schreiben.",
          })
        : sp.outlook_disconnected === "1"
          ? ({ kind: "success" as const, message: "Outlook-Verbindung wurde getrennt." })
          : null;

  return (
    <KalenderPageClient
      view={view}
      monthYm={monthYm}
      anchorD={anchorD}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      outlookSyncYm={outlookSyncYm}
      events={events}
      plannedTasks={plannedTasks}
      loadError={loadError}
      outlookLinked={outlookLinked}
      outlookFlash={outlookFlash}
      calendarWorkMode={calendarWorkMode}
      plannerBundle={plannerBundle}
    />
  );
}

import { PlanerPageClient } from "@/components/planer/planer-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchCalendarEventsForBerlinYmdRange } from "@/lib/calendar/fetch-range";
import type { CalendarEventRow } from "@/lib/calendar/types";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { fetchPlannerStandardBlocksForUser } from "@/lib/planer/fetch-planner-standard-blocks";
import { fetchTasksPageData } from "@/lib/tasks/fetch-tasks";
import { taskIsBookedInCalendar } from "@/lib/tasks/types";
import Link from "next/link";

export default async function PlanerPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.planer} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [tasksRes, eventsRes, standardBlocksRes] = await Promise.all([
    fetchTasksPageData(supabase),
    fetchCalendarEventsForBerlinYmdRange(
      supabase,
      user.id,
      new Date().toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    ),
    fetchPlannerStandardBlocksForUser(supabase, user.id),
  ]);

  const plannerTasks = tasksRes.tasks
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
    }));

  const editableTasks = tasksRes.tasks.filter((task) => !task.completed_at);

  return (
    <PlanerPageClient
      initialTasks={plannerTasks}
      initialStandardBlocks={standardBlocksRes.blocks}
      initialEvents={(eventsRes.events ?? []) as CalendarEventRow[]}
      editableTasks={editableTasks}
      taskAreas={tasksRes.areas}
      standardBlocksLoadError={standardBlocksRes.error}
    />
  );
}

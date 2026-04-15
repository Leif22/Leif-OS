import { DashboardContextSidebar } from "@/components/dashboard/dashboard-context-sidebar";
import { DashboardInboxClient } from "@/components/dashboard/dashboard-inbox-client";
import { PageHeader } from "@/components/ui/page-header";
import { fetchTodayDashboardData } from "@/lib/dashboard/fetch-today-dashboard";
import { fetchPendingDashboardInbox } from "@/lib/inbox/fetch-pending-dashboard-inbox";
import { fetchAreasForPage } from "@/lib/areas/fetch-areas-page";
import { fetchTaskTypesForUser } from "@/lib/task-types/fetch-task-types";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import type { AreaRow } from "@/lib/tasks/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.dashboard} />
        <p className="text-sm text-leif-secondary">
          Du bist noch nicht angemeldet. Ohne Session kann das Dashboard keine Daten aus Supabase
          laden.
        </p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [inbox, today, areasRes, taskTypesRes] = await Promise.all([
    fetchPendingDashboardInbox(supabase, user.id),
    fetchTodayDashboardData(supabase, user.id),
    fetchAreasForPage(supabase, user.id),
    fetchTaskTypesForUser(supabase, user.id),
  ]);

  const openCount = inbox.error ? undefined : inbox.items.length;
  const areas: AreaRow[] = areasRes.error
    ? []
    : areasRes.areas.map((a) => ({
        id: a.id,
        name: a.name,
        sort_order: a.sort_order,
      }));

  return (
    <div className="-mt-3 space-y-2 pb-4 sm:-mt-4">
      <h1 className="sr-only">{PRODUCT_LABEL.dashboard}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-8">
        <div className="min-w-0">
          <DashboardInboxClient
            userId={user.id}
            items={inbox.items}
            progress={inbox.progress}
            areas={areas}
            taskTypes={taskTypesRes.taskTypes}
            loadError={inbox.error}
            areasLoadError={areasRes.error}
            openCount={openCount}
          />
        </div>

        <DashboardContextSidebar data={today} />
      </div>
    </div>
  );
}

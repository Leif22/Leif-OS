import { DashboardInboxClient } from "@/components/dashboard/dashboard-inbox-client";
import { RecommendedTaskBlock } from "@/components/tasks/recommended-task-block";
import { fetchUnreadDashboardInbox } from "@/lib/inbox/fetch-unread";
import { createClient } from "@/lib/supabase/server";
import { fetchRecommendedTask } from "@/lib/tasks/fetch-recommended";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Du bist noch nicht angemeldet. Ohne Session kann das Dashboard keine Daten aus Supabase
          laden.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [reco, inbox] = await Promise.all([
    fetchRecommendedTask(supabase, user.id),
    fetchUnreadDashboardInbox(supabase, user.id),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <RecommendedTaskBlock
        task={reco.task}
        breakdown={reco.breakdown}
        areas={reco.areas}
        recommendationError={reco.error}
      />

      <DashboardInboxClient items={inbox.items} loadError={inbox.error} />
    </div>
  );
}

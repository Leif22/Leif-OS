import { TasksClient } from "@/components/tasks/tasks-client";
import { createClient } from "@/lib/supabase/server";
import { fetchRecommendedTask } from "@/lib/tasks/fetch-recommended";
import { fetchTasksPageData } from "@/lib/tasks/fetch-tasks";
import Link from "next/link";

export default async function TasksPage() {
  const supabase = await createClient();
  const { user, tasks, areas, loadError } = await fetchTasksPageData(supabase);

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Du bist noch nicht angemeldet.
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

  if (loadError) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Daten konnten nicht geladen werden: {loadError}
        </p>
      </div>
    );
  }

  const reco = await fetchRecommendedTask(supabase, user.id, areas);

  return (
    <TasksClient
      tasks={tasks}
      areas={areas}
      recommended={
        reco.task && reco.breakdown ? { task: reco.task, breakdown: reco.breakdown } : null
      }
      recommendedError={reco.error}
    />
  );
}

import { TasksClient } from "@/components/tasks/tasks-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  fetchSparringTaskDraft,
  fetchSparringTaskDraftFromMessage,
  type SparringTaskDraft,
} from "@/lib/sparring/task-draft";
import { createClient } from "@/lib/supabase/server";
import { fetchTaskTypesForUser } from "@/lib/task-types/fetch-task-types";
import { fetchRecommendedTask } from "@/lib/tasks/fetch-recommended";
import { fetchProjectsForUser } from "@/lib/projects/fetch-projects";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { fetchTasksPageData } from "@/lib/tasks/fetch-tasks";
import Link from "next/link";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{
    new?: string;
    from_sparring?: string;
    from_sparring_message?: string;
    task?: string;
    area?: string;
  }>;
};

export default async function TasksPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { user, tasks, areas, loadError } = await fetchTasksPageData(supabase);
  const taskTypesRes = user ? await fetchTaskTypesForUser(supabase, user.id) : { taskTypes: [], error: null };
  const projectsRes = user ? await fetchProjectsForUser(supabase, user.id) : { projects: [], error: null };
  const docsRes = await supabase
    .from("documents")
    .select("id,title")
    .order("created_at", { ascending: false })
    .limit(200);
  const documents =
    docsRes.error || !docsRes.data
      ? []
      : docsRes.data.map((d) => ({ id: String(d.id), title: String(d.title ?? "") }));

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.tasks} />
        <p className="text-sm text-leif-secondary">Du bist noch nicht angemeldet.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.tasks} />
        <AlertBanner variant="error">Daten konnten nicht geladen werden: {loadError}</AlertBanner>
      </div>
    );
  }

  let sparringTaskDraft: SparringTaskDraft | null = null;
  const rawMsg = typeof sp.from_sparring_message === "string" ? sp.from_sparring_message.trim() : "";
  const hasMsg = /^[0-9a-f-]{36}$/i.test(rawMsg);
  if (hasMsg) {
    const d = await fetchSparringTaskDraftFromMessage(supabase, user.id, rawMsg);
    if (d.ok) sparringTaskDraft = d.draft;
  } else if (sp.from_sparring) {
    const d = await fetchSparringTaskDraft(supabase, user.id, sp.from_sparring);
    if (d.ok) sparringTaskDraft = d.draft;
  }

  const reco = await fetchRecommendedTask(supabase, user.id, areas);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <PageHeader title={PRODUCT_LABEL.tasks} />
          <p className="text-sm text-leif-muted">Lade…</p>
        </div>
      }
    >
      <TasksClient
        tasks={tasks}
        areas={areas}
        taskTypes={taskTypesRes.taskTypes}
        documents={documents}
        projects={projectsRes.projects.map((p) => ({ id: p.id, name: p.name }))}
        recommended={
          reco.task && reco.breakdown ? { task: reco.task, breakdown: reco.breakdown } : null
        }
        recommendedError={reco.error}
        sparringTaskDraft={sparringTaskDraft}
      />
    </Suspense>
  );
}

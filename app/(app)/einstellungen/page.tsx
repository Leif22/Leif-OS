import { OutlookSection } from "@/components/einstellungen/outlook-section";
import { PlannerStandardBlocksSection } from "@/components/einstellungen/planner-standard-blocks-section";
import { TaskTypesSection } from "@/components/einstellungen/task-types-section";
import { TelegramSection } from "@/components/einstellungen/telegram-section";
import { InboxAiRulesSection } from "@/components/einstellungen/inbox-ai-rules-section";
import { ProjectsSection } from "@/components/einstellungen/projects-section";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchProjectsForUser } from "@/lib/projects/fetch-projects";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { fetchPlannerStandardBlocksForUser } from "@/lib/planer/fetch-planner-standard-blocks";
import { fetchTaskTypesForUser } from "@/lib/task-types/fetch-task-types";
import Link from "next/link";

function isMissingInboxRulesTableError(message: string): boolean {
  return message.includes("Could not find the table 'public.user_inbox_ai_rules'") || message.includes("schema cache");
}

function isMissingPlannerStandardBlocksTableError(message: string): boolean {
  return (
    message.includes("Could not find the table 'public.user_planner_standard_blocks'") ||
    message.includes("schema cache")
  );
}

export default async function EinstellungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.einstellungen} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const { data: link } = await supabase
    .from("telegram_account_links")
    .select("telegram_username, linked_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const [msTok, calPlannerPref, taskTypesRes, aiRulesRes, projectsRes, plannerStdRes] = await Promise.all([
    supabase.from("microsoft_oauth_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_calendar_planner_prefs")
      .select("outlook_sync_exclude_new_by_default")
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchTaskTypesForUser(supabase, user.id),
    supabase.from("user_inbox_ai_rules").select("rules_text").eq("user_id", user.id).maybeSingle(),
    fetchProjectsForUser(supabase, user.id),
    fetchPlannerStandardBlocksForUser(supabase, user.id),
  ]);
  const inboxRulesInitial =
    aiRulesRes.error && isMissingInboxRulesTableError(String(aiRulesRes.error.message ?? aiRulesRes.error))
    ? ""
    : String(aiRulesRes.data?.rules_text ?? "");

  const plannerStandardBlocksInitial =
    plannerStdRes.error && isMissingPlannerStandardBlocksTableError(plannerStdRes.error)
      ? {
          blocks: [],
          loadError: "Die Tabelle für Standardblöcke fehlt — bitte Supabase-Migrationen anwenden.",
        }
      : { blocks: plannerStdRes.blocks, loadError: plannerStdRes.error };

  return (
    <div className="space-y-8">
      <PageHeader title={PRODUCT_LABEL.einstellungen} description={PRODUCT_COPY.einstellungenPageDescription} />
      <OutlookSection
        linked={Boolean(msTok.data)}
        defaultExcludeOutlookFromPlanner={Boolean(
          calPlannerPref.data?.outlook_sync_exclude_new_by_default,
        )}
      />
      <PlannerStandardBlocksSection
        blocks={plannerStandardBlocksInitial.blocks}
        loadError={plannerStandardBlocksInitial.loadError}
      />
      <InboxAiRulesSection initialRules={inboxRulesInitial} />
      <ProjectsSection projects={projectsRes.projects} loadError={projectsRes.error} />
      <TaskTypesSection taskTypes={taskTypesRes.taskTypes} loadError={taskTypesRes.error} />
      <TelegramSection link={link ?? null} />
    </div>
  );
}

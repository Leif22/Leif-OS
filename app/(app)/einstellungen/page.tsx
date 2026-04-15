import { OutlookSection } from "@/components/einstellungen/outlook-section";
import { TaskTypesSection } from "@/components/einstellungen/task-types-section";
import { TelegramSection } from "@/components/einstellungen/telegram-section";
import { InboxAiRulesSection } from "@/components/einstellungen/inbox-ai-rules-section";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { fetchTaskTypesForUser } from "@/lib/task-types/fetch-task-types";
import Link from "next/link";

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
  const [msTok, calPlannerPref, taskTypesRes, aiRulesRes] = await Promise.all([
    supabase.from("microsoft_oauth_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_calendar_planner_prefs")
      .select("outlook_sync_exclude_new_by_default")
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchTaskTypesForUser(supabase, user.id),
    supabase.from("user_inbox_ai_rules").select("rules_text").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={PRODUCT_LABEL.einstellungen} description={PRODUCT_COPY.einstellungenPageDescription} />
      <OutlookSection
        linked={Boolean(msTok.data)}
        defaultExcludeOutlookFromPlanner={Boolean(
          calPlannerPref.data?.outlook_sync_exclude_new_by_default,
        )}
      />
      <InboxAiRulesSection initialRules={String(aiRulesRes.data?.rules_text ?? "")} />
      <TaskTypesSection taskTypes={taskTypesRes.taskTypes} loadError={taskTypesRes.error} />
      <TelegramSection link={link ?? null} />
    </div>
  );
}

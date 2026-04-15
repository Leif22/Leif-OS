import { InboxPageClient } from "@/components/inbox/inbox-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchAreasForPage } from "@/lib/areas/fetch-areas-page";
import { fetchClosedInboxItems, fetchPendingInboxItems } from "@/lib/inbox/fetch-inbox-page";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import { fetchTaskTypesForUser } from "@/lib/task-types/fetch-task-types";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.inbox} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [pend, closed, areasRes, taskTypesRes] = await Promise.all([
    fetchPendingInboxItems(supabase, user.id),
    fetchClosedInboxItems(supabase, user.id),
    fetchAreasForPage(supabase, user.id),
    fetchTaskTypesForUser(supabase, user.id),
  ]);

  const areas: AreaRow[] = areasRes.error
    ? []
    : areasRes.areas.map((a) => ({
        id: a.id,
        name: a.name,
        sort_order: a.sort_order,
      }));

  return (
    <InboxPageClient
      userId={user.id}
      pending={pend.items}
      closed={closed.items}
      areas={areas}
      taskTypes={taskTypesRes.taskTypes}
      errors={{
        pending: pend.error ?? areasRes.error,
        closed: closed.error,
      }}
    />
  );
}

import { InboxPageClient } from "@/components/inbox/inbox-page-client";
import { fetchClosedInboxItems, fetchPendingInboxItems } from "@/lib/inbox/fetch-inbox-page";
import { createClient } from "@/lib/supabase/server";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Bitte melde dich an.</p>
        <Link
          href="/login"
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [pend, closed, areasRes] = await Promise.all([
    fetchPendingInboxItems(supabase, user.id),
    fetchClosedInboxItems(supabase, user.id),
    supabase.from("areas").select("id, name, sort_order").order("sort_order"),
  ]);

  const areas = (areasRes.data ?? []) as AreaRow[];
  const areasError = areasRes.error?.message ?? null;

  return (
    <InboxPageClient
      pending={pend.items}
      closed={closed.items}
      areas={areasError ? [] : areas}
      errors={{
        pending: pend.error,
        closed: closed.error,
      }}
    />
  );
}

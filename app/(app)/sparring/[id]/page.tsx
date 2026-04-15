import { SparringChatClient } from "@/components/sparring/sparring-chat-client";
import { buttonClassName } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { fetchDocumentsForUser } from "@/lib/documents/fetch-documents";
import { fetchSparringChatById, fetchSparringMessages } from "@/lib/sparring/fetch-sparring";
import { KI_WORKSPACE_LABEL } from "@/lib/sparring/ki-workspace-label";
import { createClient } from "@/lib/supabase/server";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SparringChatPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const { chat, error: chatErr } = await fetchSparringChatById(supabase, user.id, id);
  if (chatErr) {
    return (
      <div className="space-y-4">
        <Link
          href="/sparring"
          className="text-sm font-medium text-leif-secondary underline-offset-4 hover:text-leif-text hover:underline"
        >
          ← {KI_WORKSPACE_LABEL}
        </Link>
        <AlertBanner variant="error">{chatErr}</AlertBanner>
      </div>
    );
  }
  if (!chat) notFound();

  const { messages, error: msgErr } = await fetchSparringMessages(supabase, user.id, id);

  const { data: areaRows, error: areaErr } = await supabase
    .from("areas")
    .select("id, name, sort_order")
    .order("sort_order");

  const areas: AreaRow[] = areaErr ? [] : ((areaRows ?? []) as AreaRow[]);

  const { items: documents } = await fetchDocumentsForUser(supabase, user.id);

  return (
    <SparringChatClient
      chat={chat}
      messages={messages}
      loadError={msgErr}
      areas={areas}
      documents={documents}
    />
  );
}

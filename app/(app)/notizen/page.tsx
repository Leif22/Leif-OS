import { NotizenPageClient } from "@/components/notizen/notizen-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchNotesForUser } from "@/lib/notes/fetch-notes";
import {
  fetchSparringNotizPrefill,
  fetchSparringNotizPrefillFromMessage,
  type SparringNotizPrefill,
} from "@/lib/sparring/note-prefill";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{
    new?: string;
    note?: string;
    area?: string;
    from_sparring?: string;
    from_sparring_message?: string;
  }>;
};

export default async function NotizenPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.notizen} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [{ notes, error: notesErr }, areasRes] = await Promise.all([
    fetchNotesForUser(supabase, user.id),
    supabase.from("areas").select("id, name, sort_order").eq("user_id", user.id).order("sort_order"),
  ]);

  const areas = (areasRes.data ?? []) as AreaRow[];
  const loadError = notesErr ?? areasRes.error?.message ?? null;

  const wantNew = sp.new === "1";
  const rawNote = typeof sp.note === "string" ? sp.note.trim() : "";
  const hasNoteParam = /^[0-9a-f-]{36}$/i.test(rawNote);
  const rawArea = typeof sp.area === "string" ? sp.area.trim() : "";
  const initialAreaPrefill =
    rawArea && areas.some((a) => a.id === rawArea) ? rawArea : "";
  const rawSparring = typeof sp.from_sparring === "string" ? sp.from_sparring.trim() : "";
  const hasSparringParam = /^[0-9a-f-]{36}$/i.test(rawSparring);
  const rawMsg = typeof sp.from_sparring_message === "string" ? sp.from_sparring_message.trim() : "";
  const hasMsgParam = /^[0-9a-f-]{36}$/i.test(rawMsg);

  let sparringNotizDraft: SparringNotizPrefill | null = null;
  if (wantNew && hasMsgParam) {
    const p = await fetchSparringNotizPrefillFromMessage(supabase, user.id, rawMsg);
    if (p.ok) sparringNotizDraft = p.prefill;
  } else if (wantNew && hasSparringParam) {
    const p = await fetchSparringNotizPrefill(supabase, user.id, rawSparring);
    sparringNotizDraft = p.ok ? p.prefill : { chat_id: rawSparring, content: "" };
  }

  let initialDialog: "none" | "create" | "edit" = "none";
  let initialNoteId: string | null = null;
  if (wantNew) {
    initialDialog = "create";
  } else if (hasNoteParam) {
    initialDialog = "edit";
    initialNoteId = rawNote;
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <PageHeader title={PRODUCT_LABEL.notizen} />
          <p className="text-sm text-leif-muted">Lade…</p>
        </div>
      }
    >
      <NotizenPageClient
        notes={notes}
        areas={areas}
        loadError={loadError}
        initialDialog={initialDialog}
        initialNoteId={initialNoteId}
        initialAreaPrefill={initialAreaPrefill}
        sparringNotizDraft={sparringNotizDraft}
      />
    </Suspense>
  );
}

import { DokumentePageClient } from "@/components/dokumente/dokumente-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchDocumentsForUser } from "@/lib/documents/fetch-documents";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ new?: string }>;
};

export default async function DokumentePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.dokumente} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const [{ items, error: docsErr }, areasRes, notesRes] = await Promise.all([
    fetchDocumentsForUser(supabase, user.id),
    supabase.from("areas").select("id, name, sort_order").eq("user_id", user.id).order("sort_order"),
    supabase
      .from("notes")
      .select("id, content, type")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(300),
  ]);

  const areas = (areasRes.data ?? []) as AreaRow[];
  const notes = (notesRes.data ?? []) as { id: string; content: string; type: string }[];

  const loadError = docsErr ?? areasRes.error?.message ?? notesRes.error?.message ?? null;

  return (
    <DokumentePageClient
      documents={items}
      areas={areas}
      notes={notes}
      loadError={loadError}
      initialCreateOpen={sp.new === "1"}
    />
  );
}

import { DokumentDetailClient } from "@/components/dokumente/dokument-detail-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchDocumentDetail } from "@/lib/documents/fetch-document-detail";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import type { AreaRow } from "@/lib/tasks/types";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function DokumentDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  const [{ doc, error }, areasRes, notesRes] = await Promise.all([
    fetchDocumentDetail(supabase, user.id, id),
    supabase.from("areas").select("id, name, sort_order").eq("user_id", user.id).order("sort_order"),
    supabase
      .from("notes")
      .select("id, content, type")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(300),
  ]);

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={PRODUCT_LABEL.dokumente} />
        <p className="text-sm text-red-800">{error}</p>
        <Link href="/dokumente" className="text-sm font-medium text-leif-secondary underline">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  if (!doc) notFound();

  const areas = (areasRes.data ?? []) as AreaRow[];
  const notes = (notesRes.data ?? []) as { id: string; content: string; type: string }[];

  return <DokumentDetailClient doc={doc} areas={areas} notes={notes} />;
}

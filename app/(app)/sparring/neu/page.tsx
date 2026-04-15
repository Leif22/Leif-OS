import { SparringNeuClient } from "@/components/sparring/sparring-neu-client";
import { fetchDocumentsForUser } from "@/lib/documents/fetch-documents";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SparringNeuPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_COPY.kiNeuPageTitle} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const { items: documents } = await fetchDocumentsForUser(supabase, user.id);

  return (
    <div className="space-y-8">
      <PageHeader title={PRODUCT_COPY.kiNeuPageTitle} description={PRODUCT_COPY.kiNeuPageSubtitle} />
      <SparringNeuClient documents={documents} />
    </div>
  );
}

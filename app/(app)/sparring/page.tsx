import { SparringPageClient } from "@/components/sparring/sparring-page-client";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchSparringChats } from "@/lib/sparring/fetch-sparring";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { parseSparringListView } from "@/lib/sparring/list-view";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ new?: string; filter?: string }>;
};

export default async function SparringPage({ searchParams }: Props) {
  const { new: newParam, filter: filterParam } = await searchParams;
  const listView = parseSparringListView(filterParam);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={PRODUCT_LABEL.ki} />
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  if (newParam === "1") {
    redirect("/sparring/neu");
  }

  const { chats, error } = await fetchSparringChats(supabase, user.id, listView);

  return (
    <div className="space-y-8">
      <PageHeader
        title={PRODUCT_LABEL.ki}
        description={PRODUCT_COPY.kiPageDescription}
        actions={
          <Link href="/sparring/neu" className={buttonClassName("primary")}>
            {PRODUCT_COPY.neuesKiGespraech}
          </Link>
        }
      />
      <SparringPageClient chats={chats} loadError={error} listView={listView} />
    </div>
  );
}

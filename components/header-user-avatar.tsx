"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { cn } from "@/lib/cn";

function initialsFromEmail(email: string | undefined) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  const compact = local.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "?";
}

export function HeaderUserAvatar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Link
      href="/einstellungen"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-leif-border/45 bg-leif-surface-soft text-[12px] font-semibold leading-none text-leif-secondary",
        "transition-[color,background-color,border-color,transform] duration-200 ease-out",
        "hover:border-leif-border/60 hover:bg-leif-surface-soft hover:text-leif-text",
        "active:scale-[0.97] active:border-leif-border/50 active:bg-[#e6e8ec]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/18",
      )}
      aria-label={PRODUCT_LABEL.einstellungen}
      title={PRODUCT_LABEL.einstellungen}
    >
      {initialsFromEmail(email ?? undefined)}
    </Link>
  );
}

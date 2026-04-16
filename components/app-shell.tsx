"use client";

import type { ReactNode } from "react";

import { LeifOsLogo } from "@/components/brand/leif-os-logo";
import { GlobalPlusMenu } from "@/components/global-plus-menu";
import { GlobalSearch } from "@/components/global-search";
import { HeaderUserAvatar } from "@/components/header-user-avatar";
import { HeaderQuickCapture } from "@/components/header/header-quick-capture";
import { GlobalCreateHost } from "@/components/global-create-host";
import { ContentFrame } from "@/components/ui/content-frame";
import { SidebarNav } from "@/components/sidebar-nav";
import { SIDEBAR_NAV } from "@/components/sidebar-nav-tokens";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { cn } from "@/lib/cn";
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onGlobalCreate(ev: Event) {
      const action = (ev as CustomEvent<{ action?: string }>).detail?.action;
      if (action === "sparring") router.push("/sparring/neu");
    }
    window.addEventListener("leif-global-create", onGlobalCreate);
    return () => window.removeEventListener("leif-global-create", onGlobalCreate);
  }, [router]);

  return (
    <div className="grid min-h-full grid-cols-[240px_1fr] grid-rows-[auto_1fr] bg-leif-canvas text-leif-text">
      <header className="col-span-2 flex shrink-0 items-stretch justify-between gap-4 border-b border-leif-border/35 bg-leif-surface shadow-[0_1px_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.06)]">
        <Link
          href="/dashboard"
          className={cn(
            "grid w-[240px] shrink-0 grid-cols-[22px_minmax(0,1fr)] items-center gap-3 self-stretch px-6 outline-offset-2",
            "rounded-md outline-none transition-opacity duration-200 ease-out hover:opacity-90 active:opacity-100",
            "focus-visible:ring-2 focus-visible:ring-leif-primary/25",
          )}
        >
          <span className="inline-flex items-center justify-center">
            <LeifOsLogo decorative size={40} />
          </span>
          <span className="min-w-0 truncate text-[19px] font-semibold leading-none tracking-tight text-neutral-900">
            Leif OS
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center self-stretch px-4 py-3">
          <div className="w-full min-w-0 max-w-[560px]">
            <HeaderQuickCapture />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-stretch pr-6">
          <GlobalPlusMenu />
          <GlobalSearch />
          <Link
            href="/inbox"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border border-leif-border bg-leif-surface text-leif-secondary shadow-leif",
              "transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out",
              "hover:border-leif-border hover:bg-leif-divider hover:text-leif-text hover:shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
              "active:scale-[0.98] active:bg-[#ebecef] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/20",
            )}
            aria-label={PRODUCT_LABEL.inbox}
            title={PRODUCT_LABEL.inbox}
          >
            <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </Link>
          <HeaderUserAvatar />
        </div>
      </header>

      <aside
        className={cn(
          "flex min-h-0 flex-col border-r border-[#E5E7EB] bg-[#FAFAFA] px-3",
          "font-sans antialiased",
        )}
        style={{
          paddingTop: SIDEBAR_NAV.asidePaddingTopPx,
          paddingBottom: SIDEBAR_NAV.asidePaddingBottomPx,
        }}
      >
        <div className="min-h-0 overflow-y-auto">
          <SidebarNav pathname={pathname} />
        </div>
      </aside>

      <main className="min-h-0 overflow-auto bg-leif-canvas">
        <ContentFrame>{children}</ContentFrame>
      </main>
      <GlobalCreateHost />
    </div>
  );
}

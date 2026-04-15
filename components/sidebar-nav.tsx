"use client";

import { SIDEBAR_NAV } from "@/components/sidebar-nav-tokens";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Calendar,
  CalendarClock,
  CheckSquare,
  FileText,
  Files,
  Inbox,
  LayoutGrid,
  Settings,
} from "lucide-react";
import Link from "next/link";

const { colors: C } = SIDEBAR_NAV;

type NavEntry = { readonly href: string; readonly label: string; readonly icon: LucideIcon };

const NAV_GROUPS: readonly (readonly NavEntry[])[] = [
  [
    { href: "/dashboard", label: PRODUCT_LABEL.dashboard, icon: LayoutGrid },
    { href: "/inbox", label: PRODUCT_LABEL.inbox, icon: Inbox },
  ],
  [
    { href: "/sparring", label: PRODUCT_LABEL.ki, icon: Bot },
    { href: "/planer", label: PRODUCT_LABEL.planer, icon: CalendarClock },
    { href: "/kalender", label: PRODUCT_LABEL.kalender, icon: Calendar },
    { href: "/tasks", label: PRODUCT_LABEL.tasks, icon: CheckSquare },
  ],
  [
    { href: "/notizen", label: PRODUCT_LABEL.notizen, icon: FileText },
    { href: "/dokumente", label: PRODUCT_LABEL.dokumente, icon: Files },
  ],
  [{ href: "/einstellungen", label: PRODUCT_LABEL.einstellungen, icon: Settings }],
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export function SidebarNav({ pathname }: { pathname: string | null }) {
  const lastGroupIndex = NAV_GROUPS.length - 1;
  const indicatorHeight = SIDEBAR_NAV.itemHeightPx - 2 * SIDEBAR_NAV.indicatorVerticalInsetPx;

  return (
    <nav
      className="flex min-h-0 flex-col font-sans text-[15px] antialiased"
      style={{ gap: SIDEBAR_NAV.gapBetweenGroupsPx }}
      aria-label="Hauptnavigation"
    >
      {NAV_GROUPS.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="flex flex-col"
          style={{
            gap:
              groupIndex === lastGroupIndex
                ? SIDEBAR_NAV.gapNotesMemoryPairPx
                : SIDEBAR_NAV.gapWithinGroupPx,
          }}
        >
          {group.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 overflow-hidden px-3 transition-colors duration-150",
                  "hover:cursor-pointer",
                  active ? "font-semibold" : "bg-transparent font-medium hover:bg-[#F8FAFC]",
                )}
                style={{
                  height: SIDEBAR_NAV.itemHeightPx,
                  borderRadius: SIDEBAR_NAV.itemRadiusPx,
                  backgroundColor: active ? C.bgActive : undefined,
                  color: active ? C.textActive : C.text,
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute transition-colors duration-150"
                  style={{
                    left: SIDEBAR_NAV.indicatorInsetLeftPx,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: SIDEBAR_NAV.indicatorWidthPx,
                    height: indicatorHeight,
                    borderRadius: SIDEBAR_NAV.indicatorRadiusPx,
                    backgroundColor: active ? C.indicator : "transparent",
                  }}
                />
                <span
                  className="relative z-[1] inline-flex shrink-0 items-center justify-center"
                  style={{
                    width: SIDEBAR_NAV.iconSlotWidthPx,
                    height: SIDEBAR_NAV.iconSizePx,
                  }}
                >
                  <Icon
                    className="shrink-0"
                    style={{
                      width: SIDEBAR_NAV.iconSizePx,
                      height: SIDEBAR_NAV.iconSizePx,
                      color: active ? C.iconActive : C.icon,
                    }}
                    aria-hidden
                    strokeWidth={2.35}
                  />
                </span>
                <span className="relative z-[1] min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

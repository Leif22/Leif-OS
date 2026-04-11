"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bereiche", label: "Bereiche" },
  { href: "/sparring", label: "Sparring" },
  { href: "/inbox", label: "Inbox" },
  { href: "/tasks", label: "Tasks" },
  { href: "/kalender", label: "Kalender" },
  { href: "/personen", label: "Personen" },
] as const;

const TITLE_BY_PATH: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.href, item.label])
);

function titleForPath(pathname: string | null): string {
  if (!pathname) return "Leif OS";
  const hit = TITLE_BY_PATH[pathname];
  if (hit) return hit;
  const prefix = `/${pathname.split("/")[1] ?? ""}`;
  return TITLE_BY_PATH[prefix] ?? "Leif OS";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = titleForPath(pathname);

  return (
    <div className="grid min-h-full grid-cols-[13.75rem_1fr] grid-rows-[auto_1fr] bg-background text-foreground">
      <div className="col-span-2 flex h-14 items-stretch border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex w-[13.75rem] shrink-0 items-center border-r border-zinc-200/80 px-4 text-sm font-semibold tracking-tight dark:border-zinc-800">
          Leif OS
        </div>
        <div className="flex min-w-0 flex-1 items-center px-4">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div aria-hidden className="min-w-0" />
            <p className="truncate text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {pageTitle}
            </p>
            <div className="flex min-w-0 items-center justify-end gap-2">
            <div
              className="h-9 w-44 max-w-[40vw] rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500"
              aria-hidden
              title="Suche (Platzhalter)"
            />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-zinc-300 text-lg leading-none text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
              aria-label="Plus (Platzhalter)"
            >
              +
            </button>
            </div>
          </div>
        </div>
      </div>

      <nav
        className="flex flex-col gap-0.5 border-r border-zinc-200/80 p-2 dark:border-zinc-800"
        aria-label="Hauptnavigation"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-200/80 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-h-0 overflow-auto p-6">{children}</main>
    </div>
  );
}

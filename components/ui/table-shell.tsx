import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TableShellProps = {
  children: ReactNode;
  className?: string;
};

/** Tabellen-Container: ruhige Zeilen, Hover, subtile Trenner — ohne hartes Grid. */
export function TableShell({ children, className }: TableShellProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[12px] border border-leif-border bg-white shadow-leif",
        "[&_tbody_tr]:border-b [&_tbody_tr]:border-leif-divider [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150",
        "[&_tbody_tr:last-child]:border-b-0 [&_tbody_tr:hover]:bg-[#F8FAFC]",
        "[&_tbody_td]:align-middle [&_tbody_tr]:min-h-[44px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

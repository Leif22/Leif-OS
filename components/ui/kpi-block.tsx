import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type KpiBlockProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

/** Kompakter KPI-Kasten für Nebenspalten / ruhige Übersichten */
export function KpiBlock({ label, value, hint, className }: KpiBlockProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-leif-border bg-white px-4 py-3 shadow-leif",
        className,
      )}
    >
      <p className="text-[12px] font-medium text-leif-muted">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-leif-text">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-leif-secondary">{hint}</p> : null}
    </div>
  );
}

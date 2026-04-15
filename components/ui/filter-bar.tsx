import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-4 rounded-[12px] border border-leif-border bg-white p-4 shadow-leif",
        className,
      )}
    >
      {children}
    </div>
  );
}

type FilterFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-[13px] font-medium text-leif-secondary">{label}</span>
      {children}
    </div>
  );
}

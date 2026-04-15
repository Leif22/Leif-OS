import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-[#F3F4F6] text-[#374151]",
  primary: "bg-leif-primary-soft text-leif-primary-hover",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-red-50 text-red-800",
  danger: "bg-red-50 text-red-800",
  info: "bg-blue-50 text-blue-800",
  muted: "bg-[#F3F4F6] text-leif-muted ring-1 ring-inset ring-leif-border",
} as const;

export type StatusChipTone = keyof typeof tones;

type StatusChipProps = {
  children: ReactNode;
  tone?: StatusChipTone;
  className?: string;
};

export function StatusChip({ children, tone = "neutral", className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-[10px] py-1 text-[12px] font-medium leading-tight",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

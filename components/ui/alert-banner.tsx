import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const styles = {
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
} as const;

export type AlertBannerVariant = keyof typeof styles;

type AlertBannerProps = {
  children: ReactNode;
  variant?: AlertBannerVariant;
  role?: "alert" | "status";
  className?: string;
};

export function AlertBanner({
  children,
  variant = "info",
  role = variant === "error" ? "alert" : "status",
  className,
}: AlertBannerProps) {
  return (
    <p
      role={role}
      className={cn(
        "rounded-[8px] border px-3 py-2 text-sm leading-relaxed shadow-none",
        styles[variant],
        className,
      )}
    >
      {children}
    </p>
  );
}

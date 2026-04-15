import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base = cn(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] text-sm font-medium",
  "transition-[background-color,border-color,color,box-shadow,opacity] duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-leif-canvas",
  "disabled:pointer-events-none disabled:opacity-45",
);

const variants = {
  primary: cn(
    "bg-leif-primary text-white shadow-leif hover:bg-leif-primary-hover active:bg-leif-primary-hover",
  ),
  secondary: cn(
    "border border-leif-border bg-white text-leif-text shadow-leif hover:bg-[#F8FAFC] active:bg-leif-divider",
  ),
  ghost: cn(
    "border border-transparent text-leif-secondary hover:bg-[#F8FAFC] hover:text-leif-text",
  ),
  danger: cn(
    "border border-red-200 bg-white text-red-700 shadow-leif hover:bg-red-50 active:bg-red-50",
  ),
} as const;

export type ButtonVariant = keyof typeof variants;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: "md" | "sm" = "md",
  className?: string,
): string {
  const sizes = size === "sm" ? "h-9 px-3 text-[13px]" : "h-10 px-4";
  return cn(base, variants[variant], sizes, className);
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, size, className)} {...props} />;
}

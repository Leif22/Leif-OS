import { cn } from "@/lib/cn";

const fieldRing = cn(
  "w-full min-w-0 rounded-[8px] border border-leif-border bg-leif-surface px-3 text-sm text-leif-text",
  "transition-[border-color,box-shadow] duration-150 ease-out",
  "placeholder:text-leif-muted",
  "focus:border-leif-primary focus:outline-none focus:ring-2 focus:ring-leif-primary/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/** Single-line controls (input, select). */
export const controlClass = cn(fieldRing, "h-10");

/** Compact single-line control (topbar search). */
export const controlClassCompact = cn(fieldRing, "h-9 text-[13px]");

/** Multi-line text fields. */
export const textareaClass = cn(
  fieldRing,
  "min-h-[5.5rem] resize-y py-2.5 leading-snug",
);

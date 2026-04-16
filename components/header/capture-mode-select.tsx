"use client";

import { cn } from "@/lib/cn";
import { PRODUCT_COPY } from "@/lib/product-labels";
import { Calendar, ChevronDown, Inbox, ListTodo, StickyNote, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { HEADER_CAPTURE_MODES, headerCaptureModeLabel, type HeaderCaptureMode } from "@/components/header/capture-modes";

const MODE_ICONS: Record<HeaderCaptureMode, LucideIcon> = {
  inbox: Inbox,
  task: ListTodo,
  termin: Calendar,
  notiz: StickyNote,
};

function ModeGlyph({ mode, className }: { mode: HeaderCaptureMode; className?: string }) {
  const Icon = MODE_ICONS[mode];
  return <Icon className={cn("size-[18px] shrink-0 stroke-[1.75]", className)} aria-hidden />;
}

const itemClass = cn(
  "flex w-full items-center justify-center rounded-md px-2 py-2 transition-[background-color,color] duration-200 ease-out",
  "hover:bg-leif-divider active:bg-leif-divider/90",
  "focus-visible:bg-leif-divider focus-visible:outline-none",
);

type Props = {
  value: HeaderCaptureMode;
  onChange: (mode: HeaderCaptureMode) => void;
  disabled?: boolean;
};

export function CaptureModeSelect({ value, onChange, disabled }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const valueLabel = headerCaptureModeLabel(value);

  return (
    <div ref={rootRef} className="relative shrink-0 self-stretch sm:self-center">
      <button
        type="button"
        id={`${id}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${PRODUCT_COPY.headerCaptureAriaMode}: ${valueLabel}`}
        title={valueLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex h-10 min-w-[3.25rem] items-center justify-center gap-0.5 rounded-[10px] border border-leif-border/60 bg-leif-surface px-1.5 text-leif-text",
          "shadow-[0_1px_2px_rgba(15,23,42,0.045)] transition-[border-color,box-shadow,opacity] duration-200 ease-out",
          "hover:border-leif-border/75 focus:border-leif-border/70 focus:outline-none",
          "focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--leif-primary)_14%,transparent),0_2px_8px_-2px_rgba(15,23,42,0.08)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <ModeGlyph mode={value} className="text-leif-text" />
        <ChevronDown
          className={cn("size-3 shrink-0 text-leif-secondary transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-trigger`}
          className="absolute left-0 z-50 mt-1.5 min-w-[2.75rem] overflow-hidden rounded-xl border border-leif-border bg-leif-surface py-1 shadow-leif"
        >
          {HEADER_CAPTURE_MODES.map((m) => {
            const label = headerCaptureModeLabel(m);
            return (
              <li key={m} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={m === value}
                  aria-label={label}
                  title={label}
                  className={cn(itemClass, m === value && "bg-leif-divider/60")}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  <ModeGlyph mode={m} className="text-leif-text" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

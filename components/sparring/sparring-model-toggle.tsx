"use client";

import type { AiModelKey } from "@/lib/ai/config";
import { cn } from "@/lib/cn";

const segBtn =
  "inline-flex min-h-9 flex-1 items-center justify-center rounded-[6px] px-3 text-[13px] font-medium transition-colors sm:min-w-[5.5rem]";

type Props = {
  value: AiModelKey;
  onChange: (next: AiModelKey) => void;
  disabled?: boolean;
  className?: string;
};

export function SparringModelToggle({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id="sparring-model-label" className="text-[12px] font-medium text-leif-muted">
        KI-Modell
      </span>
      <div
        className="inline-flex w-full max-w-md rounded-[8px] border border-leif-border bg-white p-0.5 shadow-sm sm:w-auto"
        role="group"
        aria-labelledby="sparring-model-label"
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(
            segBtn,
            value === "default"
              ? "bg-leif-primary text-white shadow-sm"
              : "text-leif-secondary hover:bg-leif-canvas",
          )}
          aria-pressed={value === "default"}
          onClick={() => onChange("default")}
        >
          Normal
        </button>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            segBtn,
            value === "fast"
              ? "bg-leif-primary text-white shadow-sm"
              : "text-leif-secondary hover:bg-leif-canvas",
          )}
          aria-pressed={value === "fast"}
          onClick={() => onChange("fast")}
        >
          Schnell
        </button>
      </div>
      <p className="max-w-md text-[11px] leading-snug text-leif-muted">
        Normal = stärkeres Standardmodell · Schnell = kleineres Modell (günstiger, für einfache Fragen).
      </p>
    </div>
  );
}

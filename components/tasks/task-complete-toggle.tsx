"use client";

import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  done: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  /** Liste ≈20px, Empfehlung etwas größer */
  size?: "sm" | "md";
};

export function TaskCompleteToggle({ done, disabled, onClick, size = "sm" }: Props) {
  const [pop, setPop] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const box =
    size === "md"
      ? "h-[22px] w-[22px] min-h-[22px] min-w-[22px]"
      : "h-5 w-5 min-h-[20px] min-w-[20px]";
  const icon = size === "md" ? "size-3.5" : "size-3";

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick(e);
    setPop(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPop(false), 340);
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
      disabled={disabled}
      className={cn(
        "mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 outline-none",
        "transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-out",
        "focus-visible:ring-2 focus-visible:ring-leif-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-leif-canvas",
        "active:enabled:scale-95",
        box,
        pop && "scale-[1.14] shadow-lg",
        done
          ? cn(
              "border-emerald-600 bg-emerald-600 text-white shadow-sm",
              pop && "border-emerald-500 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]",
            )
          : cn(
              "border-leif-border/90 bg-white shadow-sm",
              "hover:border-leif-primary/60 hover:bg-leif-primary/[0.09] hover:shadow-md hover:ring-2 hover:ring-leif-primary/15",
              pop && "border-leif-primary/50 ring-2 ring-leif-primary/25",
            ),
        disabled && "cursor-not-allowed opacity-45",
      )}
      onClick={handleClick}
    >
      {done ? <Check className={cn(icon, "stroke-[2.5]")} strokeWidth={2.5} aria-hidden /> : null}
    </button>
  );
}

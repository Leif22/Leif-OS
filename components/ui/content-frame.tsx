import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Zentrierter Content mit max. Breite (Desktop-SaaS), horizontal 24px Padding. */
export function ContentFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1320px] px-6 py-8", className)}
      {...props}
    />
  );
}

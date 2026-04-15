import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Vertikaler Block mit einheitlichem Abstand zur nächsten Section (32px ab zweitem Block).
 * Innerhalb: typisch `space-y-3` / `space-y-4` für Kindelemente.
 */
export function PageSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("mt-8 space-y-4 first:mt-0", className)} {...props} />;
}

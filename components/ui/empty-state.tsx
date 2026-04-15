import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title?: string;
  description: string;
  /** Optional z. B. Lucide-Icon (16–20px), visuell ruhig */
  illustration?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, illustration, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-dashed border-leif-border bg-white px-8 py-16 text-center shadow-leif",
        className,
      )}
    >
      {illustration ? (
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center text-leif-muted [&_svg]:size-5">
          {illustration}
        </div>
      ) : null}
      {title ? <p className="text-[15px] font-semibold text-leif-text">{title}</p> : null}
      <p
        className={cn(
          "text-sm font-normal leading-relaxed text-leif-secondary",
          title ? "mt-2" : "",
        )}
      >
        {description}
      </p>
      {children ? <div className="mt-8 flex justify-center gap-2">{children}</div> : null}
    </div>
  );
}

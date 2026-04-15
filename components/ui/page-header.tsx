import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const hasDescription = Boolean(description);
  return (
    <header
      className={cn(
        "flex flex-col border-b border-leif-border sm:flex-row sm:items-start sm:justify-between",
        hasDescription ? "gap-4 pb-8 sm:gap-6" : "gap-0 pb-3 sm:gap-4",
        className,
      )}
    >
      <div className={cn("min-w-0", hasDescription && "space-y-2")}>
        <h1 className="text-[28px] font-semibold leading-[1.2] tracking-tight text-leif-text">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[13px] font-normal leading-relaxed text-leif-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5">{actions}</div>
      ) : null}
    </header>
  );
}

export function SectionTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-[19px] font-semibold leading-snug tracking-tight text-leif-text",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

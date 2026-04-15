"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PRODUCT_COPY } from "@/lib/product-labels";

type MenuAction = "task" | "note" | "document" | "sparring";
type MenuItem = { readonly action: MenuAction; readonly label: string };

type MenuBlock = { readonly id: string; readonly items: readonly MenuItem[] };

const MENU_BLOCKS: readonly MenuBlock[] = [
  {
    id: "create",
    items: [
      { action: "task", label: PRODUCT_COPY.plusMenuDropdownNeuerTask },
      { action: "note", label: PRODUCT_COPY.plusMenuDropdownNeueNotiz },
    ],
  },
  {
    id: "work",
    items: [
      { action: "sparring", label: PRODUCT_COPY.plusMenuDropdownKiSparring },
      { action: "document", label: PRODUCT_COPY.plusMenuDropdownDokumentHochladen },
    ],
  },
] as const;

const itemClass = cn(
  "block rounded-md px-3 py-2.5 text-[13px] font-medium leading-none text-leif-text whitespace-nowrap",
  "transition-[background-color,color] duration-200 ease-out",
  "hover:bg-leif-divider active:bg-leif-divider/90",
  "focus-visible:bg-leif-divider focus-visible:outline-none",
);

export function GlobalPlusMenu() {
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

  function triggerAction(action: MenuAction) {
    window.dispatchEvent(new CustomEvent("leif-global-create", { detail: { action } }));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative self-center">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-[9px] border border-leif-primary bg-leif-primary px-3.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]",
          "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out",
          "hover:border-leif-primary-hover hover:bg-leif-primary-hover hover:shadow-[0_1px_3px_rgba(15,23,42,0.1)]",
          "active:scale-[0.98] active:border-leif-primary-hover active:bg-leif-primary-hover active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leif-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-leif-surface",
        )}
        title={PRODUCT_COPY.schnellanlageTitle}
      >
        <span>+ Neu</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-white/80 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          className="absolute right-0 z-50 mt-2 w-max min-w-[13rem] overflow-hidden rounded-xl border border-leif-border bg-leif-surface py-2 shadow-leif"
        >
          {MENU_BLOCKS.map((block, blockIndex) => (
            <div key={block.id}>
              {blockIndex > 0 ? (
                <div
                  className="mx-2 my-2 border-t border-leif-border"
                  role="separator"
                  aria-hidden
                />
              ) : null}
              <div className="flex flex-col gap-0.5 px-1.5" role="presentation">
                {block.items.map((item) => (
                  <button
                    key={`${block.id}-${item.action}`}
                    type="button"
                    role="menuitem"
                    onClick={() => triggerAction(item.action)}
                    className={itemClass}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { runGlobalSearch, type GlobalSearchHit } from "@/app/(app)/search/actions";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { PRODUCT_LABEL } from "@/lib/product-labels";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 320;

function commandBarPlaceholder() {
  if (typeof window === "undefined") return "Suchen oder Strg + K drücken";
  const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isApple ? "Suchen oder ⌘K drücken" : "Suchen oder Strg + K drücken";
}

function hitHref(h: GlobalSearchHit): string {
  switch (h.type) {
    case "task":
      return `/tasks?task=${encodeURIComponent(h.id)}`;
    case "area":
      return `/tasks?area=${encodeURIComponent(h.id)}`;
    case "inbox":
      return `/inbox`;
    case "calendar":
      return `/kalender?m=${encodeURIComponent(h.monthYm)}`;
    case "note":
      return `/notizen?note=${encodeURIComponent(h.id)}`;
    case "sparring":
      return `/sparring/${encodeURIComponent(h.id)}`;
    case "document":
      return `/dokumente/${encodeURIComponent(h.id)}`;
    default:
      return "/dashboard";
  }
}

function hitLabel(h: GlobalSearchHit): string {
  switch (h.type) {
    case "task":
      return "Task";
    case "area":
      return PRODUCT_LABEL.lebensbereich;
    case "inbox":
      return PRODUCT_LABEL.inbox;
    case "calendar":
      return PRODUCT_LABEL.kalender;
    case "note":
      return PRODUCT_LABEL.notiz;
    case "sparring":
      return PRODUCT_LABEL.ki;
    case "document":
      return PRODUCT_LABEL.dokument;
    default:
      return "";
  }
}

export function GlobalSearch() {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsDialogRef = useRef<HTMLDialogElement>(null);
  const [placeholder, setPlaceholder] = useState("Suchen oder Strg + K drücken");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  const run = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setError(null);
      setPending(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await runGlobalSearch(trimmed);
      if (!res.ok) {
        setHits([]);
        setError(res.error);
        return;
      }
      setHits(res.hits);
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!open && debounced.length < 2) return;
    void run(debounced);
  }, [debounced, open, run]);

  useEffect(() => {
    setPlaceholder(commandBarPlaceholder());
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "k" && e.key !== "K") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = resultsDialogRef.current;
    if (!el) return;
    if (resultsDialogOpen) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [resultsDialogOpen]);

  const showPanel = open && (q.trim().length >= 2 || pending || error || hits.length > 0);

  return (
    <div ref={wrapRef} className="relative flex w-full min-w-0 items-center">
      <label htmlFor={inputId} className="sr-only">
        Globale Suche
      </label>
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-leif-border/55 bg-leif-surface-soft px-4",
          "shadow-[0_1px_2px_rgba(15,23,42,0.045),0_2px_6px_-1px_rgba(15,23,42,0.05)]",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
          "hover:border-leif-border/65 hover:bg-leif-surface-soft hover:shadow-[0_1px_3px_rgba(15,23,42,0.055),0_3px_10px_-2px_rgba(15,23,42,0.06)]",
          "focus-within:border-leif-border/60 focus-within:bg-leif-surface focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--leif-primary)_14%,transparent),0_2px_10px_-2px_rgba(15,23,42,0.08)]",
        )}
      >
        <Search className="pointer-events-none size-4 shrink-0 text-leif-muted" strokeWidth={1.85} aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (hits.length === 0) return;
            e.preventDefault();
            setOpen(false);
            setResultsDialogOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "h-full min-w-0 flex-1 border-0 bg-transparent py-0 text-[13px] text-leif-text",
            "placeholder:text-leif-muted",
            "focus:outline-none focus:ring-0",
          )}
        />
      </div>
      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 w-full min-w-[min(100%,18rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface shadow-leif"
          role="listbox"
          aria-label="Suchergebnisse"
        >
          {pending ? (
            <p className="px-4 py-3 text-xs text-leif-muted">Suche…</p>
          ) : error ? (
            <p className="px-4 py-3 text-xs text-leif-error">{error}</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-xs text-leif-muted">Keine Treffer.</p>
          ) : (
            <ul className="max-h-80 overflow-auto py-2 text-sm">
              {hits.map((h) => (
                <li key={`${h.type}-${h.id}`}>
                  <Link
                    href={hitHref(h)}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                      setHits([]);
                    }}
                    className="flex flex-col gap-1 px-4 py-2.5 transition-colors duration-150 hover:bg-leif-divider/80"
                    role="option"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate font-medium text-leif-text">
                        {h.title}
                      </span>
                      <StatusChip tone="muted" className="shrink-0 scale-90">
                        {hitLabel(h)}
                      </StatusChip>
                    </span>
                    {h.type !== "area" && h.subtitle ? (
                      <span className="truncate text-xs text-leif-secondary">{h.subtitle}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <dialog
        ref={resultsDialogRef}
        className="w-[min(100vw-2rem,42rem)] max-h-[min(90vh,44rem)] overflow-hidden rounded-[12px] border border-leif-border bg-leif-surface p-0 text-leif-text shadow-leif [&::backdrop]:bg-black/25"
        onClose={() => setResultsDialogOpen(false)}
      >
        <div className="flex max-h-[min(90vh,44rem)] flex-col">
          <header className="border-b border-leif-divider px-5 py-4">
            <h3 className="text-base font-semibold text-leif-text">Suchergebnisse</h3>
            <p className="mt-1 text-[12px] text-leif-secondary">Wähle einen Eintrag, um dorthin zu springen.</p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pending ? (
              <p className="px-4 py-3 text-xs text-leif-muted">Suche…</p>
            ) : error ? (
              <p className="px-4 py-3 text-xs text-leif-error">{error}</p>
            ) : hits.length === 0 ? (
              <p className="px-4 py-3 text-xs text-leif-muted">Keine Treffer.</p>
            ) : (
              <ul className="py-2 text-sm">
                {hits.map((h) => (
                  <li key={`dlg-${h.type}-${h.id}`}>
                    <Link
                      href={hitHref(h)}
                      onClick={() => {
                        setResultsDialogOpen(false);
                        setQ("");
                        setHits([]);
                      }}
                      className="flex flex-col gap-1 px-4 py-2.5 transition-colors duration-150 hover:bg-leif-divider/80"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate font-medium text-leif-text">{h.title}</span>
                        <StatusChip tone="muted" className="shrink-0 scale-90">
                          {hitLabel(h)}
                        </StatusChip>
                      </span>
                      {h.type !== "area" && h.subtitle ? (
                        <span className="truncate text-xs text-leif-secondary">{h.subtitle}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className="flex justify-end border-t border-leif-divider px-5 py-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setResultsDialogOpen(false)}>
              Schließen
            </Button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}

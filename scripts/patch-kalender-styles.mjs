import fs from "node:fs";

const p = new URL("../components/kalender/kalender-page-client.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");

const pairs = [
  ["text-zinc-900", "text-leif-text"],
  ["text-zinc-800", "text-leif-text"],
  ["text-zinc-700", "text-leif-secondary"],
  ["text-zinc-600", "text-leif-secondary"],
  ["text-zinc-500", "text-leif-muted"],
  ["border-zinc-200", "border-leif-border"],
  ["border-zinc-100", "border-leif-divider"],
  ["border-zinc-300", "border-leif-border"],
  ["divide-zinc-200", "divide-leif-divider"],
  ["bg-zinc-50", "bg-leif-divider/60"],
  ["hover:bg-zinc-50", "hover:bg-leif-divider/50"],
  ["hover:bg-zinc-100", "hover:bg-leif-divider"],
  ["hover:text-zinc-800", "hover:text-leif-text"],
  ["bg-zinc-200", "bg-leif-divider"],
  ["rounded-lg", "rounded-[12px]"],
  ["bg-emerald-500", "bg-leif-primary"],
  ["bg-amber-500", "bg-leif-warning"],
  ["bg-red-500", "bg-leif-error"],
  ["text-emerald-950", "text-leif-primary-hover"],
  ["border-emerald-200/80", "border-leif-primary/30"],
  ["bg-emerald-50/80", "bg-leif-primary-soft"],
  ["hover:bg-emerald-100/80", "hover:bg-leif-primary-soft"],
];

for (const [a, b] of pairs) s = s.split(a).join(b);

s = s.replace(
  /function viewTabClass\(active: boolean\): string \{\s*return active\s*\?[^\n]+\n\s*:[^\n]+;/,
  `function viewTabClass(active: boolean): string {
  return active
    ? "rounded-[8px] bg-leif-primary px-3 py-1.5 text-sm font-medium text-white shadow-leif"
    : "rounded-[8px] border border-leif-border bg-leif-surface px-3 py-1.5 text-sm font-medium text-leif-secondary transition-colors hover:bg-leif-divider/50";
}`,
);

s = s.split("bg-zinc-900").join("bg-leif-primary");
s = s.split("hover:bg-zinc-800").join("hover:bg-leif-primary-hover");

// Unread mail row used sky — soften to primary-soft
s = s.split("bg-sky-50/60").join("bg-leif-primary-soft/80");

fs.writeFileSync(p, s);
console.log("patched", p.pathname);

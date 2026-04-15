import { fetchAreaDetail } from "@/lib/areas/fetch-area-detail";
import { PRODUCT_COPY, PRODUCT_LABEL } from "@/lib/product-labels";
import { taskPriorityChipTone, taskStatusChipTone } from "@/lib/tasks/chip-tones";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/types";
import { createClient } from "@/lib/supabase/server";
import { AlertBanner } from "@/components/ui/alert-banner";
import { buttonClassName } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { TableShell } from "@/components/ui/table-shell";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

function statusLabel(s: string): string {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}

function priorityLabel(p: string): string {
  return TASK_PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function noteTypeLabel(t: "note" | "draft"): string {
  return t === "draft" ? "Entwurf" : PRODUCT_LABEL.notiz;
}

function clipNote(s: string, max: number): string {
  const x = s.replace(/\s+/g, " ").trim();
  if (x.length <= max) return x;
  return `${x.slice(0, max - 1)}…`;
}

function sparringTypeLabel(t: string): string {
  if (t === "context") return "Kontext";
  if (t === "project") return "Projekt";
  return "Frei";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export default async function BereichDetailPage({ params }: PageProps) {
  const { id: areaId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-leif-secondary">Bitte melde dich an.</p>
        <Link href="/login" className={buttonClassName("primary")}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  const { area, tasks, sparring, notes, errors } = await fetchAreaDetail(supabase, user.id, areaId);

  if (!area) {
    notFound();
  }

  const errBlock =
    errors.length > 0 ? <AlertBanner variant="warning">{errors.join(" · ")}</AlertBanner> : null;

  const linkMuted = "text-sm font-medium text-leif-secondary underline-offset-4 hover:text-leif-text hover:underline";
  const sectionBtn = buttonClassName("secondary", "sm");

  return (
    <div className="space-y-8">
      <nav className="text-sm text-leif-muted">
        <Link href="/einstellungen#task-bereiche" className={linkMuted}>
          {PRODUCT_LABEL.lebensbereiche}
        </Link>
        <span className="mx-2 text-leif-divider">/</span>
        <span className="font-medium text-leif-text">{area.name}</span>
      </nav>

      <header className="space-y-2 border-b border-leif-border pb-8">
        <h1 className="text-[28px] font-semibold leading-[1.2] tracking-tight text-leif-text">{area.name}</h1>
        <p className="text-[13px] text-leif-muted">Slug: {area.slug}</p>
        {area.description ? (
          <p className="max-w-prose text-[14px] leading-relaxed text-leif-secondary">{area.description}</p>
        ) : (
          <p className="text-[13px] text-leif-muted">Keine Beschreibung.</p>
        )}
      </header>

      {errBlock}

      <section className="space-y-4" aria-labelledby="bereich-tasks-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle id="bereich-tasks-heading">Tasks</SectionTitle>
          <Link href={`/tasks?new=1&area=${encodeURIComponent(area.id)}`} className={sectionBtn}>
            {PRODUCT_COPY.taskInThisLebensbereich}
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-leif-muted">{PRODUCT_COPY.keineTasksInLebensbereich}</p>
        ) : (
          <TableShell>
            <table className="w-full min-w-[40rem] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-leif-divider bg-white">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Titel</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Priorität</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Geplant</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="transition-colors duration-150">
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/tasks?task=${encodeURIComponent(t.id)}`}
                        className="font-semibold text-leif-text underline-offset-4 hover:underline"
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone={taskStatusChipTone(t.status)}>{statusLabel(t.status)}</StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone={taskPriorityChipTone(t.priority)}>{priorityLabel(t.priority)}</StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle text-[12px] text-leif-muted">{t.planned_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="bereich-sparring-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle id="bereich-sparring-heading">{PRODUCT_LABEL.ki}</SectionTitle>
          <Link href="/sparring/neu" className={sectionBtn}>
            {PRODUCT_COPY.neuesKiGespraech}
          </Link>
        </div>
        {sparring.length === 0 ? (
          <p className="text-sm text-leif-muted">{PRODUCT_COPY.kiKeinKontext}</p>
        ) : (
          <TableShell>
            <table className="w-full min-w-[36rem] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-leif-divider bg-white">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Titel</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Typ</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-leif-secondary">Aktualisiert</th>
                </tr>
              </thead>
              <tbody>
                {sparring.map((c) => (
                  <tr key={c.id} className="transition-colors duration-150">
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/sparring/${c.id}`}
                        className="font-semibold text-leif-text underline-offset-4 hover:underline"
                      >
                        {c.title.trim() || PRODUCT_COPY.kiChatRowFallback}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-leif-secondary">{sparringTypeLabel(c.type)}</td>
                    <td className="px-4 py-3 align-middle">
                      <StatusChip tone={c.is_open ? "neutral" : "muted"}>
                        {c.is_open ? "Offen" : "Geschlossen"}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3 align-middle tabular-nums text-leif-secondary">{formatWhen(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="bereich-notes-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle id="bereich-notes-heading">{PRODUCT_LABEL.notizen}</SectionTitle>
          <Link href={`/notizen?new=1&area=${encodeURIComponent(area.id)}`} className={sectionBtn}>
            {PRODUCT_LABEL.notiz} anlegen
          </Link>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-leif-muted">{PRODUCT_COPY.keineNotizenInLebensbereich}</p>
        ) : (
          <ul className="divide-y divide-leif-divider overflow-hidden rounded-[12px] border border-leif-border bg-white shadow-leif">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 transition-colors duration-150 hover:bg-[#F8FAFC]"
              >
                <Link
                  href={`/notizen?note=${encodeURIComponent(n.id)}`}
                  className="min-w-0 flex-1 text-[14px] font-semibold text-leif-text underline-offset-4 hover:underline"
                >
                  {clipNote(n.content, 120)}
                </Link>
                <span className="shrink-0 text-[12px] text-leif-muted">
                  {noteTypeLabel(n.type)} · {formatWhen(n.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

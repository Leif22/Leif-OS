"use server";

import { createClient } from "@/lib/supabase/server";
import { timestampToBerlinYmd } from "@/lib/dashboard/berlin-date";

export type GlobalSearchHit =
  | { type: "task"; id: string; title: string; subtitle: string | null }
  | { type: "area"; id: string; title: string }
  | { type: "inbox"; id: string; title: string; subtitle: string | null }
  | { type: "calendar"; id: string; title: string; subtitle: string | null; monthYm: string }
  | { type: "note"; id: string; title: string; subtitle: string | null }
  | { type: "sparring"; id: string; title: string; subtitle: string | null }
  | { type: "document"; id: string; title: string; subtitle: string | null };

export type GlobalSearchResponse =
  | { ok: true; hits: GlobalSearchHit[] }
  | { ok: false; error: string };

function sanitizeQuery(raw: string): string | null {
  const t = raw.trim().slice(0, 80);
  if (t.length < 2) return null;
  // % _ \ sind ilike-Metazeichen; , ( ) nur falls später .or()-Filterstrings gebaut werden
  return t.replace(/[%_\\,()]/g, "");
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function runGlobalSearch(raw: string): Promise<GlobalSearchResponse> {
  const q = sanitizeQuery(raw);
  if (!q) return { ok: true, hits: [] };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Nicht angemeldet." };

  const pattern = `%${q}%`;
  const limit = 8;

  const [tasksRes, areasRes, inboxRes, calRes, notesRes, sparringRes, documentsTitleRes, documentsFileRes] =
    await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, areas(name)")
      .ilike("title", pattern)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("areas")
      .select("id, name")
      .ilike("name", pattern)
      .order("sort_order", { ascending: true })
      .limit(limit),
    supabase
      .from("inbox_items")
      .select("id, content, status")
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("calendar_events")
      .select("id, title, start_time")
      .ilike("title", pattern)
      .order("start_time", { ascending: false })
      .limit(limit),
    supabase
      .from("notes")
      .select("id, content, type")
      .ilike("content", pattern)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("sparring_chats")
      .select("id, title, areas!sparring_chats_area_id_fkey(name)")
      .is("deleted_at", null)
      .ilike("title", pattern)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("documents")
      .select("id, title, original_filename")
      .ilike("title", pattern)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("documents")
      .select("id, title, original_filename")
      .ilike("original_filename", pattern)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const hits: GlobalSearchHit[] = [];

  if (!tasksRes.error && tasksRes.data) {
    for (const row of tasksRes.data as {
      id: string;
      title: string;
      areas: { name: string } | { name: string }[] | null;
    }[]) {
      const areaName = Array.isArray(row.areas)
        ? row.areas[0]?.name
        : row.areas?.name;
      hits.push({
        type: "task",
        id: row.id,
        title: row.title,
        subtitle: areaName ?? null,
      });
    }
  }

  if (!areasRes.error && areasRes.data) {
    for (const row of areasRes.data as { id: string; name: string }[]) {
      hits.push({ type: "area", id: row.id, title: row.name });
    }
  }

  if (!inboxRes.error && inboxRes.data) {
    for (const row of inboxRes.data as {
      id: string;
      content: string;
      status: string;
    }[]) {
      hits.push({
        type: "inbox",
        id: row.id,
        title: clip(row.content.replace(/\s+/g, " ").trim(), 72),
        subtitle: row.status,
      });
    }
  }

  if (!notesRes.error && notesRes.data) {
    for (const row of notesRes.data as { id: string; content: string; type: string }[]) {
      hits.push({
        type: "note",
        id: row.id,
        title: clip(row.content.replace(/\s+/g, " ").trim(), 72),
        subtitle: row.type === "draft" ? "Entwurf" : "Notiz",
      });
    }
  }

  if (!sparringRes.error && sparringRes.data) {
    for (const row of sparringRes.data as {
      id: string;
      title: string;
      areas: { name: string } | { name: string }[] | null;
    }[]) {
      const areaName = Array.isArray(row.areas) ? row.areas[0]?.name : row.areas?.name;
      const t = row.title?.trim() ?? "";
      hits.push({
        type: "sparring",
        id: row.id,
        title: t.length ? clip(t, 72) : "Sparring (ohne Titel)",
        subtitle: areaName ?? null,
      });
    }
  }

  type DocRow = { id: string; title: string; original_filename: string };
  const docById = new Map<string, DocRow>();
  if (!documentsTitleRes.error && documentsTitleRes.data) {
    for (const row of documentsTitleRes.data as DocRow[]) docById.set(row.id, row);
  }
  if (!documentsFileRes.error && documentsFileRes.data) {
    for (const row of documentsFileRes.data as DocRow[]) docById.set(row.id, row);
  }
  for (const row of docById.values()) {
    hits.push({
      type: "document",
      id: row.id,
      title: row.title.trim() || clip(row.original_filename, 72),
      subtitle: row.original_filename !== row.title ? row.original_filename : null,
    });
  }

  if (!calRes.error && calRes.data) {
    for (const row of calRes.data as {
      id: string;
      title: string;
      start_time: string;
    }[]) {
      const d = new Date(row.start_time);
      const subtitle = Number.isFinite(d.getTime())
        ? d.toLocaleString("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : null;
      const ymd = timestampToBerlinYmd(row.start_time);
      const monthYm = ymd.slice(0, 7);
      hits.push({
        type: "calendar",
        id: row.id,
        title: row.title,
        subtitle,
        monthYm,
      });
    }
  }

  return { ok: true, hits };
}

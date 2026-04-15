import type { CalendarEventFormPayload } from "@/lib/calendar/types";
import { timestampToBerlinYmd } from "@/lib/dashboard/berlin-date";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type GraphDateTime = { dateTime: string; timeZone: string };

const BERLIN = "Europe/Berlin";

export function utcIsoToGraphDateTime(isoUtc: string, timeZone: string): GraphDateTime {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) throw new Error("Ungültiger Zeitpunkt");
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const dateTime = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.0000000`;
  return { dateTime, timeZone };
}

function ymdAddCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d + days));
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, "0")}-${String(nd.getUTCDate()).padStart(2, "0")}`;
}

export function buildGraphEventBody(payload: CalendarEventFormPayload): Record<string, unknown> {
  if (payload.is_all_day) {
    const startYmd = timestampToBerlinYmd(payload.start_time);
    const endExclusive = ymdAddCalendarDays(startYmd, 1);
    return {
      subject: payload.title.trim(),
      body: {
        contentType: "text",
        content: payload.description.trim() || "",
      },
      isAllDay: true,
      start: { dateTime: `${startYmd}T00:00:00.0000000`, timeZone: BERLIN },
      end: { dateTime: `${endExclusive}T00:00:00.0000000`, timeZone: BERLIN },
    };
  }
  return {
    subject: payload.title.trim(),
    body: {
      contentType: "text",
      content: payload.description.trim() || "",
    },
    location: payload.location?.trim() ? { displayName: payload.location.trim() } : undefined,
    sensitivity: payload.is_private ? "private" : "normal",
    isAllDay: false,
    start: utcIsoToGraphDateTime(payload.start_time, BERLIN),
    end: utcIsoToGraphDateTime(payload.end_time, BERLIN),
  };
}

async function readGraphError(res: Response, text: string): Promise<string> {
  try {
    const j = JSON.parse(text) as { error?: { message?: string } };
    return (j.error?.message ?? text) || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

export async function graphCreateEvent(
  accessToken: string,
  payload: CalendarEventFormPayload,
): Promise<string> {
  const body = buildGraphEventBody(payload);
  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(await readGraphError(res, text));
  const json = JSON.parse(text) as { id?: string };
  if (!json.id) throw new Error("Graph: Antwort ohne Event-ID.");
  return json.id;
}

export type YearlyAllDayBirthdayGraphInput = {
  subject: string;
  body: string;
  /** 1–12 */
  month: number;
  /** 1–31 */
  dayOfMonth: number;
  /** Erstes Vorkommen Start YYYY-MM-DD (inkl.), Ganztag Berlin */
  firstStartYmd: string;
  /** Exklusives Ende des ersten Ganztags YYYY-MM-DD */
  firstEndExclusiveYmd: string;
};

/**
 * Serienmaster: jährlich am gleichen Kalendertag, ohne Enddatum, ganztägig (Zeitzone Berlin).
 */
export async function graphCreateYearlyAllDayRecurringEvent(
  accessToken: string,
  input: YearlyAllDayBirthdayGraphInput,
): Promise<string> {
  const body: Record<string, unknown> = {
    subject: input.subject.trim(),
    body: {
      contentType: "text",
      content: input.body.trim() || "",
    },
    isAllDay: true,
    start: {
      dateTime: `${input.firstStartYmd}T00:00:00.0000000`,
      timeZone: BERLIN,
    },
    end: {
      dateTime: `${input.firstEndExclusiveYmd}T00:00:00.0000000`,
      timeZone: BERLIN,
    },
    recurrence: {
      pattern: {
        type: "absoluteYearly",
        interval: 1,
        month: input.month,
        dayOfMonth: input.dayOfMonth,
      },
      range: {
        type: "noEnd",
        startDate: input.firstStartYmd,
        recurrenceTimeZone: BERLIN,
      },
    },
  };

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(await readGraphError(res, text));
  const json = JSON.parse(text) as { id?: string };
  if (!json.id) throw new Error("Graph: Antwort ohne Event-ID.");
  return json.id;
}

export async function graphUpdateEvent(
  accessToken: string,
  outlookEventId: string,
  payload: CalendarEventFormPayload,
): Promise<void> {
  const body = buildGraphEventBody(payload);
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(outlookEventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(await readGraphError(res, text));
  }
}

export async function graphDeleteEvent(accessToken: string, outlookEventId: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/me/events/${encodeURIComponent(outlookEventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(await readGraphError(res, text));
  }
}

export type GraphCalendarEvent = {
  id: string;
  subject?: string;
  body?: { contentType?: string; content?: string };
  isAllDay?: boolean;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  /** Serienmaster-ID (Vorkommen); fehlt oft beim Serienmaster selbst. */
  seriesMasterId?: string | null;
  /** normal | personal | private | confidential */
  sensitivity?: string | null;
  /** singleInstance | occurrence | exception | seriesMaster */
  type?: string | null;
};

/** Sichtbarkeit / Serientermin für Planer-Icons und Cache. */
export function graphOutlookPlannerFlags(ev: GraphCalendarEvent): {
  outlook_sensitivity: string | null;
  outlook_is_recurring: boolean;
} {
  const raw = ev.sensitivity;
  const outlook_sensitivity =
    typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
  const t = typeof ev.type === "string" ? ev.type : "";
  const hasSeriesMaster =
    typeof ev.seriesMasterId === "string" && Boolean(ev.seriesMasterId.trim());
  const outlook_is_recurring =
    t === "occurrence" || t === "exception" || t === "seriesMaster" || hasSeriesMaster;
  return { outlook_sensitivity, outlook_is_recurring };
}

export function graphDateTimeToIsoUtc(g: { dateTime?: string } | undefined): string | null {
  if (!g?.dateTime) return null;
  const raw = g.dateTime.trim();
  if (raw.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const trimmedFrac = raw.replace(/(\.\d{3})\d*/, "$1");
  const withZ = trimmedFrac.endsWith("Z") ? trimmedFrac : `${trimmedFrac}Z`;
  const d = new Date(withZ);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function graphEventToDbFields(ev: GraphCalendarEvent): {
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
} | null {
  const startIso = graphDateTimeToIsoUtc(ev.start);
  const endIso = graphDateTimeToIsoUtc(ev.end);
  if (!startIso || !endIso) return null;
  const rawBody =
    typeof ev.body?.content === "string"
      ? ev.body.contentType === "html"
        ? stripHtml(ev.body.content)
        : ev.body.content.trim()
      : "";
  return {
    title: (ev.subject ?? "").trim() || "(Ohne Titel)",
    description: rawBody || null,
    start_time: startIso,
    end_time: endIso,
    is_all_day: Boolean(ev.isAllDay),
  };
}

/** Ohne $select liefert calendarView oft keine sensitivity/type — Icons/DB brauchen diese Felder. */
const GRAPH_CALENDAR_VIEW_SELECT_FIELDS =
  "id,subject,body,isAllDay,start,end,seriesMasterId,sensitivity,type";

export async function graphListCalendarView(
  accessToken: string,
  startIso: string,
  endIso: string,
): Promise<GraphCalendarEvent[]> {
  const out: GraphCalendarEvent[] = [];
  const select = encodeURIComponent(GRAPH_CALENDAR_VIEW_SELECT_FIELDS);
  let url: string | null =
    `${GRAPH_BASE}/me/calendar/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$select=${select}&$top=50`;
  for (let page = 0; page < 20 && url; page++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(await readGraphError(res, text));
    const json = JSON.parse(text) as {
      value?: GraphCalendarEvent[];
      "@odata.nextLink"?: string;
    };
    out.push(...(json.value ?? []));
    url = json["@odata.nextLink"] ?? null;
  }
  return out;
}

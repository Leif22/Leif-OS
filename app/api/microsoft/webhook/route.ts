import { runCalendarWebhookSyncForUser } from "@/app/(app)/kalender/sync-actions";
import { tryCreateServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

type GraphNotification = {
  subscriptionId?: string;
  clientState?: string;
  resource?: string;
  userId?: string;
  resourceData?: { id?: string; "@odata.type"?: string; userId?: string; organizerId?: string };
};

function ymFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function pickMonthsForWebhook(): string[] {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return [ymFromDate(prev), ymFromDate(now), ymFromDate(next)];
}

function parseUserIdHint(v: string | null | undefined): string | null {
  const raw = v?.trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F-]{36}$/.test(raw)) return raw;
  const parts = raw.split(":");
  for (const p of parts) {
    if (/^[0-9a-fA-F-]{36}$/.test(p)) return p;
  }
  return null;
}

function extractUserIdsFromNotifications(list: GraphNotification[]): string[] {
  const out = new Set<string>();
  for (const n of list) {
    const candidate =
      parseUserIdHint(n.clientState) ??
      parseUserIdHint(n.userId) ??
      parseUserIdHint(n.resourceData?.userId) ??
      parseUserIdHint(n.resourceData?.organizerId);
    if (candidate) out.add(candidate);
  }
  return [...out];
}

function validationTokenFromRequest(request: NextRequest): string | null {
  const t = request.nextUrl.searchParams.get("validationToken");
  return t?.trim() || null;
}

function validateClientState(list: GraphNotification[]): boolean {
  const expected = process.env.MICROSOFT_WEBHOOK_CLIENT_STATE?.trim();
  if (!expected) return true;
  for (const n of list) {
    const raw = n.clientState?.trim();
    if (!raw) continue;
    if (raw === expected || raw.startsWith(`${expected}:`) || raw.includes(`:${expected}:`)) {
      return true;
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  const validationToken = validationTokenFromRequest(request);
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({ ok: true, message: "Microsoft webhook endpoint ready." });
}

export async function POST(request: NextRequest) {
  const validationToken = validationTokenFromRequest(request);
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = tryCreateServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY fehlt (Webhook-Sync deaktiviert)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const notifications = Array.isArray((body as { value?: unknown })?.value)
    ? (((body as { value: unknown[] }).value ?? []) as GraphNotification[])
    : [];

  if (notifications.length > 0 && !validateClientState(notifications)) {
    return NextResponse.json({ ok: false, error: "clientState ungültig." }, { status: 401 });
  }

  let userIds = extractUserIdsFromNotifications(notifications);
  if (userIds.length === 0) {
    // Fallback: ohne User-Hinweis nicht blockieren, sondern aktive Outlook-User mitnehmen.
    const { data, error } = await supabase
      .from("microsoft_oauth_tokens")
      .select("user_id")
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    userIds = (data ?? [])
      .map((x) => (x as { user_id: string }).user_id)
      .filter((id) => /^[0-9a-fA-F-]{36}$/.test(id));
  }

  const months = pickMonthsForWebhook();
  const fromYmd = `${months[0]}-01`;
  const toYmd = `${months[months.length - 1]}-31`;

  let syncedUsers = 0;
  let changedEvents = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    const res = await runCalendarWebhookSyncForUser(supabase, userId, {
      fromYmd,
      toYmd,
      reason: "webhook",
    });
    if (!res.ok) {
      errors.push(`${userId}: ${res.error}`);
      continue;
    }
    syncedUsers += 1;
    changedEvents += res.outlookChangedCount;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    received: notifications.length,
    syncedUsers,
    changedEvents,
    errors,
  });
}


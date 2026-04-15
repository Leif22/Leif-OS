import { processTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/process-update";
import { tryCreateServiceRoleClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  const got = request.headers.get(SECRET_HEADER);
  if (got !== expectedSecret) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = tryCreateServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await processTelegramUpdate(admin, body as TelegramUpdate);
  } catch (e) {
    console.error("[telegram] webhook", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/einstellungen");
  return NextResponse.json({ ok: true });
}

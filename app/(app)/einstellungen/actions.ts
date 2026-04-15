"use server";

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

const LINK_TOKEN_TTL_MIN = 15;

export async function createTelegramLinkToken(): Promise<
  | { ok: true; token: string; expiresAt: string; deepLink: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  await supabase.from("telegram_link_tokens").delete().eq("user_id", user.id).is("consumed_at", null);

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MIN * 60_000).toISOString();

  const { error } = await supabase.from("telegram_link_tokens").insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: error.message };

  const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? "";
  const bot = raw.replace(/^@/, "") || null;
  const deepLink = bot ? `https://t.me/${bot}?start=${encodeURIComponent(token)}` : null;

  revalidatePath("/einstellungen");
  return { ok: true, token, expiresAt, deepLink };
}

export async function unlinkTelegramAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("telegram_account_links").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/einstellungen");
  return { ok: true };
}

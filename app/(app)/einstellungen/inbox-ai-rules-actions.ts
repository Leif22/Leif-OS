"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isMissingInboxRulesTableError(message: string): boolean {
  return message.includes("Could not find the table 'public.user_inbox_ai_rules'") || message.includes("schema cache");
}

export async function saveInboxAiRules(rulesText: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Nicht angemeldet." };

  const normalized = rulesText.trim().slice(0, 4000);
  const { error } = await supabase.from("user_inbox_ai_rules").upsert({
    user_id: user.id,
    rules_text: normalized,
  });
  if (error) {
    if (isMissingInboxRulesTableError(error.message)) {
      return {
        ok: false,
        error: "KI-Regeln-Tabelle fehlt noch in der Datenbank. Bitte einmal `npm run db:push` ausführen.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  return { ok: true };
}

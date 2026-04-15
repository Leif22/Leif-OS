"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setOutlookSyncDefaultExcludeFromPlanner(
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase.from("user_calendar_planner_prefs").upsert(
    {
      user_id: userData.user.id,
      outlook_sync_exclude_new_by_default: value,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/einstellungen");
  return { ok: true };
}

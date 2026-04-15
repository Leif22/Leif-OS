"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 500;

/**
 * Abonniert Realtime-Events auf `inbox_items` für den Nutzer und ruft
 * `router.refresh()` auf (debounced), damit Dashboard/Inbox neue Einträge zeigen.
 */
export function InboxAutoRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void Promise.resolve(router.refresh()).catch(() => {});
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`inbox_items_user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbox_items",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}

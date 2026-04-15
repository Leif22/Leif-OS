import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase mit Service-Role (umgeht RLS). Nur serverseitig — niemals ans Client-Bundle.
 * Fehlt `SUPABASE_SERVICE_ROLE_KEY`, ist der Client nicht verfügbar (z. B. Webhook antwortet 503).
 */
export function tryCreateServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

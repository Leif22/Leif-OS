-- Microsoft / Outlook (Graph) OAuth tokens (PKCE, delegated Calendars.ReadWrite)

CREATE TABLE public.microsoft_oauth_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER microsoft_oauth_tokens_set_updated_at
  BEFORE UPDATE ON public.microsoft_oauth_tokens
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.microsoft_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "microsoft_oauth_tokens_user_isolation"
  ON public.microsoft_oauth_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ein Outlook-Termin pro Nutzer und Graph-Event-ID (für Sync-Upsert)
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_outlook_event_uidx
  ON public.calendar_events (user_id, outlook_event_id)
  WHERE outlook_event_id IS NOT NULL;

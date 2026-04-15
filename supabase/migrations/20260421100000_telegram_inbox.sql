-- Telegram → Inbox: Nutzer-Verknüpfung, Einmal-Tokens, idempotente Inbox-Zeilen

CREATE TABLE public.telegram_account_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE,
  telegram_username text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER telegram_account_links_set_updated_at
  BEFORE UPDATE ON public.telegram_account_links
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.telegram_account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_account_links_select_own"
  ON public.telegram_account_links
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "telegram_account_links_delete_own"
  ON public.telegram_account_links
  FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE public.telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX telegram_link_tokens_user_pending ON public.telegram_link_tokens (user_id)
  WHERE consumed_at IS NULL;

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_link_tokens_all_own"
  ON public.telegram_link_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX inbox_items_user_source_source_ref_unique
  ON public.inbox_items (user_id, source, source_ref)
  WHERE source_ref IS NOT NULL;

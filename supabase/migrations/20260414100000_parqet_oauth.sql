-- Parqet Connect OAuth tokens (PKCE public client; tokens only via RLS for own user)

CREATE TABLE public.parqet_oauth_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER parqet_oauth_tokens_set_updated_at
  BEFORE UPDATE ON public.parqet_oauth_tokens
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.parqet_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parqet_oauth_tokens_user_isolation"
  ON public.parqet_oauth_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

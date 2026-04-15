CREATE TABLE IF NOT EXISTS public.user_inbox_ai_rules (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  rules_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_inbox_ai_rules_set_updated_at ON public.user_inbox_ai_rules;
CREATE TRIGGER user_inbox_ai_rules_set_updated_at
  BEFORE UPDATE ON public.user_inbox_ai_rules
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.user_inbox_ai_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_inbox_ai_rules_user_isolation" ON public.user_inbox_ai_rules;
CREATE POLICY "user_inbox_ai_rules_user_isolation"
  ON public.user_inbox_ai_rules
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

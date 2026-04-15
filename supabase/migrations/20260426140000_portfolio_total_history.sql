-- Zeitliche Summe Gesamtvermögen (ein Eintrag pro erfolgreichem Parqet-Sync) für Dashboard-Chart

CREATE TABLE public.portfolio_total_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  total_value numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portfolio_total_history_user_recorded
  ON public.portfolio_total_history (user_id, recorded_at ASC);

ALTER TABLE public.portfolio_total_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_total_history_user_isolation"
  ON public.portfolio_total_history
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Zeitreihe Gesamtvermögen aus Parqet POST /performance (falls die API Punkte liefert)

CREATE TABLE public.portfolio_parqet_series_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  as_of timestamptz NOT NULL,
  total_value numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, as_of)
);

CREATE INDEX portfolio_parqet_series_user_asof
  ON public.portfolio_parqet_series_points (user_id, as_of ASC);

ALTER TABLE public.portfolio_parqet_series_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_parqet_series_user_isolation"
  ON public.portfolio_parqet_series_points
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

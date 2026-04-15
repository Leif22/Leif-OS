-- portfolio_snapshots + portfolio_positions (Datenmodell 2.16 / 2.17)

CREATE TABLE public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  parqet_portfolio_id text NOT NULL,
  name text NOT NULL,
  total_value numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  total_gain_loss numeric(14, 2),
  total_gain_loss_pct numeric(8, 4),
  ttwror numeric(8, 4),
  xirr numeric(8, 4),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parqet_portfolio_id)
);

CREATE INDEX portfolio_snapshots_user ON public.portfolio_snapshots (user_id);

CREATE TRIGGER portfolio_snapshots_set_updated_at
  BEFORE UPDATE ON public.portfolio_snapshots
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_snapshots_user_isolation"
  ON public.portfolio_snapshots
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.portfolio_snapshots (id) ON DELETE CASCADE,
  name text NOT NULL,
  isin text,
  ticker text,
  shares numeric(14, 6),
  current_value numeric(14, 2) NOT NULL,
  purchase_value numeric(14, 2),
  gain_loss numeric(14, 2),
  gain_loss_pct numeric(8, 4),
  weight_pct numeric(8, 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portfolio_positions_snapshot ON public.portfolio_positions (snapshot_id);

ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_positions_via_snapshot"
  ON public.portfolio_positions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_snapshots s
      WHERE s.id = portfolio_positions.snapshot_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolio_snapshots s
      WHERE s.id = portfolio_positions.snapshot_id AND s.user_id = auth.uid()
    )
  );

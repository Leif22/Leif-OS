-- Beispiel-Portfolio (USER_ID ersetzen). Migration 20260413130000 muss laufen.
-- Bei wiederholtem Ausführen ggf. zuerst: DELETE FROM public.portfolio_positions WHERE snapshot_id IN (SELECT id FROM public.portfolio_snapshots WHERE user_id = 'USER_ID');

INSERT INTO public.portfolio_snapshots (
  user_id,
  parqet_portfolio_id,
  name,
  total_value,
  currency,
  total_gain_loss,
  total_gain_loss_pct,
  fetched_at
) VALUES
  (
    'USER_ID',
    'demo-broker',
    'Broker Depot',
    42500.12,
    'EUR',
    1250.50,
    3.0284,
    now()
  ),
  (
    'USER_ID',
    'demo-scalable',
    'ETF-Sparplan',
    18200.00,
    'EUR',
    820.00,
    4.7240,
    now()
  )
ON CONFLICT (user_id, parqet_portfolio_id) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  total_gain_loss = EXCLUDED.total_gain_loss,
  total_gain_loss_pct = EXCLUDED.total_gain_loss_pct,
  fetched_at = EXCLUDED.fetched_at,
  updated_at = now();

INSERT INTO public.portfolio_positions (snapshot_id, name, ticker, shares, current_value, weight_pct)
SELECT s.id, 'Core MSCI World', 'IWDA', 120, 11200.00, 61.5
FROM public.portfolio_snapshots s
WHERE s.user_id = 'USER_ID' AND s.parqet_portfolio_id = 'demo-scalable';

INSERT INTO public.portfolio_positions (snapshot_id, name, ticker, shares, current_value, weight_pct)
SELECT s.id, 'Emerging Markets IMI', 'EIMI', 80, 7000.00, 38.5
FROM public.portfolio_snapshots s
WHERE s.user_id = 'USER_ID' AND s.parqet_portfolio_id = 'demo-scalable';

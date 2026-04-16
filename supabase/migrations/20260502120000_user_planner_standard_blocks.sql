-- Wiederkehrende Standardblöcke für den Tagesplaner (Pro Nutzer, Einstellungen + Planer)

CREATE TABLE IF NOT EXISTS public.user_planner_standard_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 45 CHECK (duration_minutes >= 15),
  priority integer NOT NULL DEFAULT 2 CHECK (priority >= 1 AND priority <= 3),
  relevance integer NOT NULL DEFAULT 7 CHECK (relevance >= 1 AND relevance <= 10),
  recurrence_rule jsonb NOT NULL DEFAULT '{"frequency":"daily","interval":1}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_planner_standard_blocks_user_sort
  ON public.user_planner_standard_blocks (user_id, sort_order, created_at);

CREATE TRIGGER user_planner_standard_blocks_set_updated_at
  BEFORE UPDATE ON public.user_planner_standard_blocks
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.user_planner_standard_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_planner_standard_blocks_isolation"
  ON public.user_planner_standard_blocks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.user_planner_standard_blocks IS 'Standard-Arbeitsblöcke für den Planer (Titel, Dauer, Wiederholung); Pflege in Einstellungen.';

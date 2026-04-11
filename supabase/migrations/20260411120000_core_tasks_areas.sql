-- Leif OS: Minimales Schema für die aktuelle App (Dashboard/Tasks + Empfehlungs-Log).
-- Ausführen in Supabase → SQL Editor (gesamte Datei), oder: supabase db push / migration up.
-- Vollständiges V1-Modell: docs/Datenmodell.md

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- areas
-- ---------------------------------------------------------------------------
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name),
  UNIQUE (user_id, slug)
);

CREATE INDEX areas_user_sort ON public.areas (user_id, sort_order);

CREATE TRIGGER areas_set_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_user_isolation"
  ON public.areas
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tasks (optionale FKs zu inbox/sparring/projekt laut Doku hier weggelassen,
-- Spalten bleiben NULL-fähig für spätere Migrationen)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas (id) ON DELETE RESTRICT,
  project_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('inbox', 'open', 'planned', 'done', 'canceled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  due_date date,
  planned_date date,
  estimated_minutes integer,
  source_inbox_item_id uuid,
  source_sparring_chat_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_user_status ON public.tasks (user_id, status);
CREATE INDEX tasks_user_area_status ON public.tasks (user_id, area_id, status);
CREATE INDEX tasks_user_planned_planned ON public.tasks (user_id, planned_date)
  WHERE status = 'planned';

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_user_isolation"
  ON public.tasks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- task_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, tag)
);

CREATE INDEX task_tags_user_tag ON public.task_tags (user_id, tag);

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_tags_user_isolation"
  ON public.task_tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- recommendation_log (kein updated_at)
-- ---------------------------------------------------------------------------
CREATE TABLE public.recommendation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recommended_task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  score numeric(6, 4) NOT NULL,
  score_priority numeric(4, 2),
  score_due numeric(4, 2),
  score_today numeric(4, 2),
  score_age numeric(4, 2),
  action text NOT NULL CHECK (action IN ('accepted', 'skipped', 'other_chosen')),
  chosen_task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recommendation_log_user_created ON public.recommendation_log (user_id, created_at DESC);
CREATE INDEX recommendation_log_user_action ON public.recommendation_log (user_id, action);

ALTER TABLE public.recommendation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendation_log_user_isolation"
  ON public.recommendation_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Bereiche-Seed (einmal pro Nutzer)
-- Ersetze :'uid' durch deine UUID aus Supabase → Authentication → Users, dann ausführen.
-- Beispiel (manuell UUID einsetzen):
--
-- INSERT INTO public.areas (user_id, name, slug, sort_order) VALUES
--   ('00000000-0000-0000-0000-000000000000', 'Hausverwaltung', 'hausverwaltung', 0),
--   ('00000000-0000-0000-0000-000000000000', 'Finanzen Firma', 'finanzen-firma', 1),
--   ('00000000-0000-0000-0000-000000000000', 'Finanzen Privat', 'finanzen-privat', 2),
--   ('00000000-0000-0000-0000-000000000000', 'Familie/Privat', 'familie-privat', 3),
--   ('00000000-0000-0000-0000-000000000000', 'Gesundheit/Sport', 'gesundheit-sport', 4);

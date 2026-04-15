-- Benutzerdefinierte Task-Arten (für Einstellungen).
CREATE TABLE IF NOT EXISTS public.user_task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS user_task_types_user_sort
  ON public.user_task_types (user_id, sort_order, created_at);

DROP TRIGGER IF EXISTS user_task_types_set_updated_at ON public.user_task_types;
CREATE TRIGGER user_task_types_set_updated_at
  BEFORE UPDATE ON public.user_task_types
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.user_task_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_task_types_user_isolation" ON public.user_task_types;
CREATE POLICY "user_task_types_user_isolation"
  ON public.user_task_types
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Task-Typ nicht mehr per harter CHECK-Liste erzwingen.
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_task_type_check;

-- Defaults je bestehendem Nutzer anlegen (idempotent).
INSERT INTO public.user_task_types (user_id, key, label, sort_order)
SELECT u.id, v.key, v.label, v.sort_order
FROM auth.users u
CROSS JOIN (
  VALUES
    ('call', 'Anruf', 0),
    ('deep', 'Fokusarbeit', 1),
    ('admin', 'Verwaltung', 2),
    ('finance', 'Finanzen', 3),
    ('meeting', 'Besprechung', 4)
) AS v(key, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_task_types utt
  WHERE utt.user_id = u.id
    AND utt.key = v.key
);

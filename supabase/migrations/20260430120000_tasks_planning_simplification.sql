-- Task-Modell vereinfachen: Planung vor Verwaltung.
ALTER TABLE public.tasks
  ALTER COLUMN area_id DROP NOT NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_id uuid;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_task_type_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_task_type_check
  CHECK (task_type IS NULL OR task_type IN ('call', 'deep', 'admin', 'finance', 'meeting'));

UPDATE public.tasks
SET priority = 'normal'
WHERE priority = 'medium';

ALTER TABLE public.tasks
  ALTER COLUMN priority SET DEFAULT 'normal';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('high', 'normal', 'low'));

CREATE INDEX IF NOT EXISTS tasks_user_completed ON public.tasks (user_id, completed_at);
CREATE INDEX IF NOT EXISTS tasks_user_planned ON public.tasks (user_id, planned_date);

-- User projects for optional assignment on tasks and notes.

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS projects_user_active_sort
  ON public.projects (user_id, is_archived, sort_order, name);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_user_isolation'
  ) THEN
    CREATE POLICY "projects_user_isolation"
      ON public.projects
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_project_id_fkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_user_project_id
  ON public.tasks (user_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notes_user_project_id
  ON public.notes (user_id, project_id)
  WHERE project_id IS NOT NULL;

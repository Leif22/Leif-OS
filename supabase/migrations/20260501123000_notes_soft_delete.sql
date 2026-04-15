ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS notes_user_deleted_updated
  ON public.notes (user_id, deleted_at, updated_at DESC);

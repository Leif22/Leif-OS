-- inbox_items (Datenmodell 2.8) + FK von tasks.source_inbox_item_id

CREATE TABLE public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  source text NOT NULL DEFAULT 'telegram',
  source_ref text,
  is_read boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'discarded')),
  processed_as text
    CHECK (
      processed_as IS NULL
      OR processed_as IN ('task', 'sparring', 'result', 'draft', 'discarded')
    ),
  processed_ref_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inbox_items_user_status_pending ON public.inbox_items (user_id, status)
  WHERE status = 'pending';

CREATE INDEX inbox_items_user_read_pending ON public.inbox_items (user_id, is_read)
  WHERE status = 'pending';

CREATE TRIGGER inbox_items_set_updated_at
  BEFORE UPDATE ON public.inbox_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_items_user_isolation"
  ON public.inbox_items
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_source_inbox_item_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_source_inbox_item_id_fkey
      FOREIGN KEY (source_inbox_item_id)
      REFERENCES public.inbox_items (id)
      ON DELETE SET NULL;
  END IF;
END $$;

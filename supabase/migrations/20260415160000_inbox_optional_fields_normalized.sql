-- Normalize optional inbox edit fields to first-class columns.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents (id) ON DELETE SET NULL;

UPDATE public.notes
SET title = COALESCE(NULLIF(split_part(content, E'\n', 1), ''), 'Notiz')
WHERE title = '';

CREATE INDEX IF NOT EXISTS notes_user_document_id ON public.notes (user_id, document_id)
  WHERE document_id IS NOT NULL;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calendar_events.location IS 'Optional event location (free text).';
COMMENT ON COLUMN public.calendar_events.is_private IS 'Private visibility flag for local event handling.';

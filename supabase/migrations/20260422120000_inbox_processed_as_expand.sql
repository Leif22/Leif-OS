-- Inbox: weitere Verarbeitungsarten (Notiz, Kontakt, Termin)

ALTER TABLE public.inbox_items DROP CONSTRAINT IF EXISTS inbox_items_processed_as_check;

ALTER TABLE public.inbox_items
  ADD CONSTRAINT inbox_items_processed_as_check
  CHECK (
    processed_as IS NULL
    OR processed_as IN (
      'task',
      'sparring',
      'result',
      'draft',
      'discarded',
      'note',
      'person',
      'event'
    )
  );

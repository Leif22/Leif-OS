-- Gelesen/Ungelesen entfällt: Inbox bleibt offen bis Verarbeitung oder Verwerfen.

DROP INDEX IF EXISTS public.inbox_items_user_read_pending;

ALTER TABLE public.inbox_items
  DROP COLUMN IF EXISTS is_read;

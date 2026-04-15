-- Soft-Delete für Sparring-Chats (Papierkorb / Filter „Gelöschte“)

ALTER TABLE public.sparring_chats
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS sparring_chats_user_deleted_updated
  ON public.sparring_chats (user_id, deleted_at, updated_at DESC);

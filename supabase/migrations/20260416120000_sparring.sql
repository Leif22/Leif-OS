-- Sparring: Chats + Nachrichten (V1 minimal, ohne KI-Antwort)

CREATE TABLE public.sparring_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'free'
    CHECK (type IN ('free', 'context', 'project')),
  area_id uuid REFERENCES public.areas (id) ON DELETE SET NULL,
  context_task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  context_inbox_item_id uuid REFERENCES public.inbox_items (id) ON DELETE SET NULL,
  is_open boolean NOT NULL DEFAULT true,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sparring_chats_user_open_updated ON public.sparring_chats (user_id, is_open, updated_at DESC);

CREATE TRIGGER sparring_chats_set_updated_at
  BEFORE UPDATE ON public.sparring_chats
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.sparring_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sparring_chats_user_isolation"
  ON public.sparring_chats
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.sparring_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.sparring_chats (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sparring_messages_chat_created ON public.sparring_messages (chat_id, created_at);

ALTER TABLE public.sparring_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sparring_messages_user_via_chat"
  ON public.sparring_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sparring_chats c
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sparring_chats c
      WHERE c.id = chat_id AND c.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.sparring_touch_chat_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sparring_chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sparring_messages_touch_chat_updated_at
  AFTER INSERT ON public.sparring_messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.sparring_touch_chat_on_message();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_source_sparring_chat_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_source_sparring_chat_id_fkey
      FOREIGN KEY (source_sparring_chat_id)
      REFERENCES public.sparring_chats (id)
      ON DELETE SET NULL;
  END IF;
END $$;

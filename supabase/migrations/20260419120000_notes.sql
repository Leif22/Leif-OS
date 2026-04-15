-- Notizen inkl. Entwurf (Datenmodell 2.11), ohne project_id bis Projekte existieren

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'note'
    CHECK (type IN ('note', 'draft')),
  area_id uuid REFERENCES public.areas (id) ON DELETE SET NULL,
  source_sparring_chat_id uuid REFERENCES public.sparring_chats (id) ON DELETE SET NULL,
  source_inbox_item_id uuid REFERENCES public.inbox_items (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_user_type ON public.notes (user_id, type);
CREATE INDEX notes_user_updated ON public.notes (user_id, updated_at DESC);

CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_user_isolation"
  ON public.notes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

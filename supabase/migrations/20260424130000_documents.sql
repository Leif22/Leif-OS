-- Dokumente: Dateien in Storage + Verknüpfungen zu Bereichen, Personen, Notizen, Gedächtnis

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'inbox', 'telegram_inbox')),
  source_inbox_item_id uuid REFERENCES public.inbox_items (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_user_created ON public.documents (user_id, created_at DESC);

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_user_isolation"
  ON public.documents
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.document_area_links (
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, area_id)
);

CREATE TABLE public.document_person_links (
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, person_id)
);

CREATE TABLE public.document_note_links (
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, note_id)
);

CREATE TABLE public.document_result_links (
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.results (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, result_id)
);

ALTER TABLE public.document_area_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_person_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_result_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_area_links_own"
  ON public.document_area_links
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.areas a WHERE a.id = area_id AND a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.areas a WHERE a.id = area_id AND a.user_id = auth.uid())
  );

CREATE POLICY "document_person_links_own"
  ON public.document_person_links
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.user_id = auth.uid())
  );

CREATE POLICY "document_note_links_own"
  ON public.document_note_links
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.notes n WHERE n.id = note_id AND n.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.notes n WHERE n.id = note_id AND n.user_id = auth.uid())
  );

CREATE POLICY "document_result_links_own"
  ON public.document_result_links
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.results r WHERE r.id = result_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.results r WHERE r.id = result_id AND r.user_id = auth.uid())
  );

CREATE POLICY "documents_bucket_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "documents_bucket_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "documents_bucket_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "documents_bucket_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

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
      'event',
      'document'
    )
  );

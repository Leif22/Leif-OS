-- Ergebnisse (minimal V1) + Zuordnung zu Bereichen

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  type text NOT NULL CHECK (type IN ('insight', 'decision')),
  project_id uuid,
  source_sparring_chat_id uuid REFERENCES public.sparring_chats (id) ON DELETE SET NULL,
  source_inbox_item_id uuid REFERENCES public.inbox_items (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX results_user_type ON public.results (user_id, type);
CREATE INDEX results_user_updated ON public.results (user_id, updated_at DESC);

CREATE TRIGGER results_set_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_user_isolation"
  ON public.results
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.result_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.results (id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, area_id)
);

CREATE INDEX result_areas_area ON public.result_areas (area_id);

ALTER TABLE public.result_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "result_areas_via_result"
  ON public.result_areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_id AND r.user_id = auth.uid()
    )
  );

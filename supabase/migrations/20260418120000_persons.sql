-- Personen (V1) + Zuordnung zu Bereichen

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  category text,
  address text,
  birthday date,
  birthday_reminder_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX persons_user_name ON public.persons (user_id, last_name, first_name);

CREATE TRIGGER persons_set_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persons_user_isolation"
  ON public.persons
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.person_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons (id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, area_id)
);

CREATE INDEX person_areas_area ON public.person_areas (area_id);

ALTER TABLE public.person_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_areas_via_person"
  ON public.person_areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND p.user_id = auth.uid()
    )
  );

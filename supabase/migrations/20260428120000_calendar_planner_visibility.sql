-- Planung: Outlook-Termine optional ausblenden (weiter im Kalender sichtbar, blockieren nicht)

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS exclude_from_planner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outlook_recurrence_group_id text;

COMMENT ON COLUMN public.calendar_events.exclude_from_planner IS 'Wenn true: Termin bleibt gespeichert, erscheint aber nicht in der Planungsansicht und blockiert keine Slots.';
COMMENT ON COLUMN public.calendar_events.outlook_recurrence_group_id IS 'Stabiler Serienschlüssel (Graph seriesMasterId oder outlook_event_id bei Einzelterminen).';

CREATE INDEX IF NOT EXISTS calendar_events_user_recurrence_group
  ON public.calendar_events (user_id, outlook_recurrence_group_id)
  WHERE outlook_recurrence_group_id IS NOT NULL;

UPDATE public.calendar_events
SET outlook_recurrence_group_id = outlook_event_id
WHERE source = 'outlook'
  AND outlook_event_id IS NOT NULL
  AND outlook_recurrence_group_id IS NULL;

CREATE TABLE IF NOT EXISTS public.user_calendar_planner_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  outlook_sync_exclude_new_by_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_calendar_planner_prefs_set_updated_at
  BEFORE UPDATE ON public.user_calendar_planner_prefs
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at();

ALTER TABLE public.user_calendar_planner_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_calendar_planner_prefs_isolation"
  ON public.user_calendar_planner_prefs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

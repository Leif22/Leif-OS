-- Outlook-Metadaten für Planer (privat, Serientermin)

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS outlook_sensitivity text,
  ADD COLUMN IF NOT EXISTS outlook_is_recurring boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calendar_events.outlook_sensitivity IS 'Graph sensitivity: normal, personal, private, confidential';
COMMENT ON COLUMN public.calendar_events.outlook_is_recurring IS 'Graph type: occurrence, exception, seriesMaster (nicht singleInstance).';

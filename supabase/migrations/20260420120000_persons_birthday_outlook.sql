-- Outlook-Serien-ID für jährlichen Geburtstags-Ganztagestermin (Graph Event / Serienmaster)

ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS birthday_outlook_event_id text NULL;

COMMENT ON COLUMN public.persons.birthday_outlook_event_id IS
  'Microsoft Graph Event-ID des Serienmasters für den jährlichen Geburtstags-Ganztagestermin; NULL wenn kein Termin oder Outlook nicht verbunden.';

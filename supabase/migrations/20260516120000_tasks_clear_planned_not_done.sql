-- Kalender-Gebucht (`planned`) nur nach echter Eintragung; alte Daten bereinigen.
UPDATE public.tasks
SET status = 'open'
WHERE status = 'planned'
  AND completed_at IS NULL;

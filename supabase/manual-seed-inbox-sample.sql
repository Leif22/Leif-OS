-- Testdaten für die Dashboard-Inbox (nur pending).
-- USER_ID durch deine UUID aus Authentication → Users ersetzen, dann im SQL Editor ausführen.

INSERT INTO public.inbox_items (user_id, content, source, status) VALUES
  (
    'USER_ID',
    'Beispiel: Erinnerung an Steuerunterlagen bis Freitag.',
    'telegram',
    'pending'
  ),
  (
    'USER_ID',
    'Zweite Nachricht – bleibt offen, bis du sie unter /inbox oder im Dashboard verarbeitest oder verwirfst.',
    'manual',
    'pending'
  );

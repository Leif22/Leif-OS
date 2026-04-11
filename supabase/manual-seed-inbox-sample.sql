-- Testdaten für die Dashboard-Inbox (nur pending + ungelesen).
-- USER_ID durch deine UUID aus Authentication → Users ersetzen, dann im SQL Editor ausführen.

INSERT INTO public.inbox_items (user_id, content, source, is_read, status) VALUES
  (
    'USER_ID',
    'Beispiel: Erinnerung an Steuerunterlagen bis Freitag.',
    'telegram',
    false,
    'pending'
  ),
  (
    'USER_ID',
    'Zweite Nachricht – nach „Als gelesen“ verschwindet sie nur hier, bleibt aber unter /inbox sichtbar, solange status = pending.',
    'manual',
    false,
    'pending'
  );

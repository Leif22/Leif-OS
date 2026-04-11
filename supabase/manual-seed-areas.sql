-- Einmal im Supabase SQL Editor ausführen (nach Login-User angelegt).
-- Bei „duplicate key“: Bereiche existieren schon – dann einfach in der App neu laden.

INSERT INTO public.areas (user_id, name, slug, sort_order) VALUES
  ('c0b33584-5b46-4566-8616-a35cf218f049', 'Hausverwaltung', 'hausverwaltung', 0),
  ('c0b33584-5b46-4566-8616-a35cf218f049', 'Finanzen Firma', 'finanzen-firma', 1),
  ('c0b33584-5b46-4566-8616-a35cf218f049', 'Finanzen Privat', 'finanzen-privat', 2),
  ('c0b33584-5b46-4566-8616-a35cf218f049', 'Familie/Privat', 'familie-privat', 3),
  ('c0b33584-5b46-4566-8616-a35cf218f049', 'Gesundheit/Sport', 'gesundheit-sport', 4)
ON CONFLICT (user_id, name) DO NOTHING;

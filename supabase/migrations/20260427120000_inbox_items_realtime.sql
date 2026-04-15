-- Realtime: Änderungen an inbox_items → Client kann per postgres_changes refreshen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inbox_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_items;
  END IF;
END $$;

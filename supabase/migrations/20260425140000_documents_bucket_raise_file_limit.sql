-- Kein festes Limit pro Datei im Bucket; Gesamtkontingent weiter über Supabase-Plan.
-- (Vorher 50 MB pro Datei aus 20260424130000 — nur Bucket-Metadaten, nicht „gesamt“.)

UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'documents';

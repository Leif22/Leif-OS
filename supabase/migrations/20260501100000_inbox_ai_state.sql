ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_status IN ('pending', 'ready', 'rejected', 'failed')),
  ADD COLUMN IF NOT EXISTS ai_suggestion jsonb,
  ADD COLUMN IF NOT EXISTS ai_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_error text;

UPDATE public.inbox_items
SET
  ai_status = CASE
    WHEN metadata ? 'ai_suggestion_rejected_at' THEN 'rejected'
    WHEN metadata ? 'ai_suggestion_v1' THEN 'ready'
    ELSE 'pending'
  END,
  ai_suggestion = CASE
    WHEN metadata ? 'ai_suggestion_v1' THEN metadata->'ai_suggestion_v1'
    ELSE ai_suggestion
  END,
  ai_checked_at = CASE
    WHEN metadata ? 'ai_suggestion_checked_at' THEN NULLIF(metadata->>'ai_suggestion_checked_at', '')::timestamptz
    ELSE ai_checked_at
  END
WHERE ai_status = 'pending';

CREATE INDEX IF NOT EXISTS inbox_items_user_ai_status_pending
  ON public.inbox_items (user_id, ai_status)
  WHERE status = 'pending';

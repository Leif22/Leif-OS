-- Sparring: OpenAI-Modellwahl pro Chat (default = OPENAI_MODEL_DEFAULT, fast = OPENAI_MODEL_FAST)

ALTER TABLE public.sparring_chats
  ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'default'
    CHECK (ai_model IN ('default', 'fast'));

COMMENT ON COLUMN public.sparring_chats.ai_model IS 'OpenAI-Modellrolle: default (stärker) oder fast (schneller/günstiger), siehe AI_MODELS in der App.';

CREATE TABLE public.voice_calls (
 id uuid PRIMARY KEY,
 session_id text,
 voice text NOT NULL DEFAULT '',
 accent text NOT NULL DEFAULT '',
 quiz boolean NOT NULL DEFAULT false,
 search boolean NOT NULL DEFAULT false,
 documents jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'starting',
 confirmed_seconds double precision,
 finalized boolean NOT NULL DEFAULT false,
 answer_count integer NOT NULL DEFAULT 0,
 search_count integer NOT NULL DEFAULT 0,
 credit_total numeric,
 last_error text,
 ended_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voice_calls TO authenticated;
GRANT ALL ON public.voice_calls TO service_role;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_calls_admin_read ON public.voice_calls FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX voice_calls_created_idx ON public.voice_calls(created_at DESC);
CREATE FUNCTION public.touch_voice_call() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER voice_calls_updated BEFORE UPDATE ON public.voice_calls FOR EACH ROW EXECUTE FUNCTION public.touch_voice_call();
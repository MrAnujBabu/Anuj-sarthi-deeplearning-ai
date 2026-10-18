CREATE TABLE public.agent_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  brain text NOT NULL DEFAULT '',
  quiz_timer_seconds integer NOT NULL DEFAULT 0 CHECK (quiz_timer_seconds BETWEEN 0 AND 600),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_settings_admin_all ON public.agent_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.agent_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;
CREATE POLICY agent_memory_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
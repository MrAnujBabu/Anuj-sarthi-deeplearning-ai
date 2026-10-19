CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', avatar_url text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE OR REPLACE FUNCTION public.create_study_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles (id,display_name) VALUES (NEW.id,coalesce(NEW.raw_user_meta_data->>'display_name',NEW.raw_user_meta_data->>'name','')) ON CONFLICT DO NOTHING; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS study_profile_signup ON auth.users;
CREATE TRIGGER study_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_study_profile();
CREATE TABLE IF NOT EXISTS public.ai_pause_state (id text PRIMARY KEY, kind text NOT NULL, message text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_pause_state TO service_role;
ALTER TABLE public.ai_pause_state ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
DROP POLICY IF EXISTS user_roles_read_own ON public.user_roles;
CREATE POLICY user_roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE IF NOT EXISTS public.memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  source_url text,
  file_path text,
  mime text,
  tracker_type text CHECK (tracker_type IN ('mistake','good_habit','bad_habit')),
  frequency integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_items_kind_check CHECK (kind IN ('note','link','file','tracker','fact','assertion_reason','insight','teacher_question','mistake_question','flashcard','active_recall','pyq','fyq'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_items TO authenticated;
GRANT ALL ON public.memory_items TO service_role;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_admin_all ON public.memory_items;
CREATE POLICY memory_admin_all ON public.memory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS agent_memory_admin_select ON storage.objects;
CREATE POLICY agent_memory_admin_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS agent_memory_admin_insert ON storage.objects;
CREATE POLICY agent_memory_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS agent_memory_admin_delete ON storage.objects;
CREATE POLICY agent_memory_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS agent_memory_admin_update ON storage.objects;
CREATE POLICY agent_memory_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
CREATE TABLE IF NOT EXISTS public.agent_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  brain text NOT NULL DEFAULT '',
  quiz_timer_seconds integer NOT NULL DEFAULT 0 CHECK (quiz_timer_seconds BETWEEN 0 AND 600),
  default_mode text NOT NULL DEFAULT 'solve' CHECK (default_mode IN ('solve','quiz')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_settings_admin_all ON public.agent_settings;
CREATE POLICY agent_settings_admin_all ON public.agent_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.agent_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'anujkumar75yadav@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS owner_admin_on_signup ON auth.users;
CREATE TRIGGER owner_admin_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'anujkumar75yadav@gmail.com' ON CONFLICT DO NOTHING;
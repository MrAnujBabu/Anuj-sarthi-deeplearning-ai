CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
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
CREATE POLICY user_roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('note','link','file','tracker')),
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
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_items TO authenticated;
GRANT ALL ON public.memory_items TO service_role;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_admin_all ON public.memory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY agent_memory_admin_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY agent_memory_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY agent_memory_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agent-memory' AND public.has_role(auth.uid(), 'admin'));
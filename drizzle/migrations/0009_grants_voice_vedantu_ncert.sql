REVOKE EXECUTE ON FUNCTION public.create_study_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
ALTER TABLE public.memory_items DROP CONSTRAINT memory_items_kind_check;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_kind_check CHECK (kind = ANY (ARRAY['note','link','file','tracker','fact','assertion_reason','insight','teacher_question','mistake_question','flashcard','active_recall','pyq','fyq','wisdom']));
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
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TABLE public.vedantu_courses (
  enrollment_id text PRIMARY KEY,
  bundle_id text NOT NULL,
  classroom_id text NOT NULL,
  title text NOT NULL,
  course_type text NOT NULL DEFAULT 'COURSE',
  language text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ACTIVE',
  valid_till timestamptz,
  banner_url text,
  batches jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_accessed_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vedantu_courses TO authenticated;
GRANT ALL ON public.vedantu_courses TO service_role;
ALTER TABLE public.vedantu_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Vedantu courses" ON public.vedantu_courses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vedantu_courses_touch BEFORE UPDATE ON public.vedantu_courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TABLE public.vedantu_classes (
  enrollment_id text NOT NULL REFERENCES public.vedantu_courses(enrollment_id) ON DELETE CASCADE,
  session_id text NOT NULL,
  batch_id text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  teacher text NOT NULL DEFAULT '',
  starts_at timestamptz,
  ends_at timestamptz,
  attended_seconds integer NOT NULL DEFAULT 0,
  has_notes_pdf boolean NOT NULL DEFAULT false,
  has_smart_notes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enrollment_id, session_id)
);
CREATE INDEX vedantu_classes_starts_idx ON public.vedantu_classes (starts_at);
CREATE INDEX vedantu_classes_session_idx ON public.vedantu_classes (session_id);
GRANT SELECT ON public.vedantu_classes TO authenticated;
GRANT ALL ON public.vedantu_classes TO service_role;
ALTER TABLE public.vedantu_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Vedantu classes" ON public.vedantu_classes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vedantu_classes_touch BEFORE UPDATE ON public.vedantu_classes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TABLE public.vedantu_class_notes (
  session_id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  markdown text NOT NULL DEFAULT '',
  sections integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vedantu_class_notes TO authenticated;
GRANT ALL ON public.vedantu_class_notes TO service_role;
ALTER TABLE public.vedantu_class_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Vedantu class notes" ON public.vedantu_class_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vedantu_class_notes_touch BEFORE UPDATE ON public.vedantu_class_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TABLE public.vedantu_tests (
  enrollment_id text NOT NULL REFERENCES public.vedantu_courses(enrollment_id) ON DELETE CASCADE,
  content_id text NOT NULL,
  test_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subjects text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'upcoming',
  content_state text NOT NULL DEFAULT '',
  opens_at timestamptz,
  closes_at timestamptz,
  result_at timestamptz,
  attempted_at timestamptz,
  duration_minutes integer,
  total_marks numeric,
  marks numeric,
  questions integer,
  result_url text,
  test_url text,
  series text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enrollment_id, content_id)
);
CREATE INDEX vedantu_tests_opens_idx ON public.vedantu_tests (opens_at);
GRANT SELECT ON public.vedantu_tests TO authenticated;
GRANT ALL ON public.vedantu_tests TO service_role;
ALTER TABLE public.vedantu_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Vedantu tests" ON public.vedantu_tests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vedantu_tests_touch BEFORE UPDATE ON public.vedantu_tests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TABLE public.vedantu_sync_state (
  id text PRIMARY KEY DEFAULT 'main',
  status text NOT NULL DEFAULT 'idle',
  lease_id uuid,
  lease_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  message text NOT NULL DEFAULT '',
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vedantu_sync_state TO authenticated;
GRANT ALL ON public.vedantu_sync_state TO service_role;
ALTER TABLE public.vedantu_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Vedantu sync state" ON public.vedantu_sync_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vedantu_sync_state_touch BEFORE UPDATE ON public.vedantu_sync_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.vedantu_sync_state (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;
create table if not exists public.ncert_snippets (id uuid primary key default gen_random_uuid(), chapter_key text not null, topic text not null, content text not null, source_url text, verified boolean not null default false, created_at timestamptz not null default now()); create unique index if not exists ncert_snippets_chapter_topic on public.ncert_snippets (chapter_key, topic); alter table public.ncert_snippets enable row level security; drop policy if exists ncert_snippets_read on public.ncert_snippets; create policy ncert_snippets_read on public.ncert_snippets for select to anon using (true);
grant select on public.ncert_snippets to anon; grant select on public.ncert_snippets to authenticated; grant all on public.ncert_snippets to service_role;
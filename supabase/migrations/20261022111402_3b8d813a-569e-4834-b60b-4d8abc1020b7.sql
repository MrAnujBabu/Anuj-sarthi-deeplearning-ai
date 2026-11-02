-- Vedantu batch mirror: admin-readable copy of the owner's Vedantu courses, classes, notes, tests and sync status.
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
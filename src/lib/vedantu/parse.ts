/**
 * Pure parsers that turn Vedantu API payloads into the rows we mirror.
 * Kept free of network/database code so they can be unit-tested with real payload shapes.
 */

export type BatchRef = { batchId: string; courseId: string; subject: string; title: string };

export type CourseRow = {
  enrollment_id: string;
  bundle_id: string;
  classroom_id: string;
  title: string;
  course_type: string;
  language: string;
  status: string;
  valid_till: string | null;
  banner_url: string | null;
  last_accessed_at: string | null;
};

export type ClassRow = {
  enrollment_id: string;
  session_id: string;
  batch_id: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  teacher: string;
  starts_at: string | null;
  ends_at: string | null;
  attended_seconds: number;
  has_notes_pdf: boolean;
  has_smart_notes: boolean;
};

export type TestStatus = "upcoming" | "attempted" | "missed" | "practice";

export type TestRow = {
  enrollment_id: string;
  content_id: string;
  test_id: string;
  title: string;
  subjects: string[];
  status: TestStatus;
  content_state: string;
  opens_at: string | null;
  closes_at: string | null;
  result_at: string | null;
  attempted_at: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  marks: number | null;
  questions: number | null;
  result_url: string | null;
  test_url: string | null;
  series: string;
};

export type CourseStats = {
  attendance?: { percent: number; scheduled: number; attended: number; quizzes: number; quizzesAttempted: number; quizzesCorrect: number };
  homework?: { shared: number; completed: number };
  tests?: { upcoming: number; attempted: number; missed: number; practice: number };
};

export const TEST_FILTERS: { filter: string; status: TestStatus }[] = [
  { filter: "LIVEANDUPCOMING", status: "upcoming" },
  { filter: "ATTEMPTED", status: "attempted" },
  { filter: "MISSED", status: "missed" },
  { filter: "PRACTICE", status: "practice" },
];

// Vedantu payloads are loosely typed JSON; every field is validated by str/num/id before use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const id = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Vedantu sends epoch milliseconds; anything outside a sane range is treated as missing. */
export function isoFromMs(v: unknown): string | null {
  const n = num(v);
  if (n === null || n < 946684800000 || n > 4102444800000) return null;
  return new Date(n).toISOString();
}

export function courseTypeLabel(type: string): string {
  if (type === "TEST_SERIES") return "Test series";
  if (type === "BOOKS") return "Books";
  if (type === "PRIME" || type === "COURSE") return "Course";
  return type ? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ") : "Course";
}

export function parseEnrollments(json: unknown): CourseRow[] {
  const list = (json as { enrolledBundles?: unknown[] } | null)?.enrolledBundles;
  if (!Array.isArray(list)) return [];
  const rows: CourseRow[] = [];
  for (const raw of list) {
    const b = raw as Raw;
    const enrollment = id(b.bundleEnrollmentId);
    const bundle = id(b.bundleId);
    if (!enrollment || !bundle) continue;
    rows.push({
      enrollment_id: enrollment,
      bundle_id: bundle,
      classroom_id: id(b.classroomId),
      title: str(b.title, 200) || "Vedantu course",
      course_type: str(b.courseFlag, 40) || str(b.tag, 40) || "COURSE",
      language: str(b.language, 40),
      status: str(b.status, 40) || "ACTIVE",
      valid_till: isoFromMs(b.validTill),
      banner_url: str(b.mobileBannerImageUrl, 600) || str(b.webBannerImageUrl, 600) || null,
      last_accessed_at: isoFromMs(b.lastAccessedTime),
    });
  }
  return rows;
}

export function parseBatches(json: unknown): BatchRef[] {
  const list = (json as { courses?: unknown[] } | null)?.courses;
  if (!Array.isArray(list)) return [];
  const out: BatchRef[] = [];
  for (const raw of list) {
    const c = raw as Raw;
    const batchId = id(c.batchId);
    if (!batchId || out.some((b) => b.batchId === batchId)) continue;
    out.push({ batchId, courseId: id(c.courseId), subject: str(c.subjectName, 60) || str(c.subject, 60), title: str(c.title, 200) });
  }
  return out;
}

type SessionCtx = { enrollmentId: string; batchId: string; subject: string; studentId: string; teachers: Map<string, string> };

function flagsOf(s: Raw): string[] {
  return Array.isArray(s.flags) ? (s.flags as unknown[]).filter((f): f is string => typeof f === "string") : [];
}

function attendance(s: Raw, studentId: string): { attended: number; teacherId: string } {
  const infos = Array.isArray(s.attendeeInfos) ? (s.attendeeInfos as Raw[]) : [];
  let attended = 0;
  let teacherId = "";
  for (const a of infos) {
    const uid = id(a.userId);
    if (uid === studentId) attended = Math.max(0, Math.round((num(a.timeInSession) ?? 0) / 1000));
    else if (!teacherId && (a.teacherSliderPicUrl !== undefined || a.role === "TEACHER")) teacherId = uid;
  }
  if (!teacherId) teacherId = id(s.presenter);
  return { attended, teacherId };
}

function sessionRow(s: Raw, chapter: string, ctx: SessionCtx): ClassRow | null {
  const sessionId = id(s.id) || id(s.otfSessionId);
  if (!sessionId) return null;
  const flags = flagsOf(s);
  const { attended, teacherId } = attendance(s, ctx.studentId);
  return {
    enrollment_id: ctx.enrollmentId,
    session_id: sessionId,
    batch_id: ctx.batchId,
    subject: str(s.subject, 60) || ctx.subject,
    chapter: str(chapter, 200),
    title: str(s.title, 300) || "Class",
    description: str(s.description, 1000),
    teacher: (teacherId && ctx.teachers.get(teacherId)) || "",
    starts_at: isoFromMs(s.startTime),
    ends_at: isoFromMs(s.endTime),
    attended_seconds: attended,
    has_notes_pdf: flags.includes("SESSION_NOTES_PDF_CREATED"),
    has_smart_notes: flags.includes("REPLAY_SMART_NOTES_GENERATED_FROM_AI"),
  };
}

/** `getChapterWiseSessions` → one row per class, carrying its chapter name. */
export function parseChapterSessions(json: unknown, ctx: SessionCtx): ClassRow[] {
  if (!Array.isArray(json)) return [];
  const rows: ClassRow[] = [];
  for (const raw of json) {
    const chapter = raw as Raw;
    const sessions = Array.isArray(chapter.sessions) ? (chapter.sessions as Raw[]) : [];
    const name = str(chapter.chapterName, 200);
    for (const s of sessions) {
      const row = sessionRow(s, name || str(s.chapterName, 200), ctx);
      if (row) rows.push(row);
    }
  }
  return rows;
}

/** `getScheduledSessionsForStudent` → class rows plus a teacher-id → name map. */
export function parseScheduledSessions(json: unknown, ctx: SessionCtx): { rows: ClassRow[]; teachers: Map<string, string> } {
  const teachers = new Map<string, string>();
  const list = Array.isArray(json) ? json : Array.isArray((json as { list?: unknown[] })?.list) ? (json as { list: unknown[] }).list : [];
  for (const raw of list) {
    const s = raw as Raw;
    const attendees = Array.isArray(s.attendees) ? (s.attendees as Raw[]) : [];
    for (const a of attendees) {
      if (a.role === "TEACHER" && id(a.userId)) teachers.set(id(a.userId), str(a.fullName, 120) || [str(a.firstName, 60), str(a.lastName, 60)].filter(Boolean).join(" "));
    }
  }
  const merged = new Map([...ctx.teachers, ...teachers]);
  const rows: ClassRow[] = [];
  for (const raw of list) {
    const s = raw as Raw;
    const row = sessionRow(s, str(s.chapterName, 200), { ...ctx, teachers: merged });
    if (!row) continue;
    const attendees = Array.isArray(s.attendees) ? (s.attendees as Raw[]) : [];
    const teacher = attendees.find((a) => a.role === "TEACHER");
    if (teacher && !row.teacher) row.teacher = merged.get(id(teacher.userId)) ?? "";
    rows.push(row);
  }
  return { rows, teachers };
}

/** Merge rows for the same class: chapter data wins, but fill blanks (teacher, flags) from the other list. */
export function mergeClassRows(primary: ClassRow[], extra: ClassRow[]): ClassRow[] {
  const map = new Map<string, ClassRow>();
  for (const r of primary) map.set(r.session_id, { ...r });
  for (const r of extra) {
    const cur = map.get(r.session_id);
    if (!cur) { map.set(r.session_id, { ...r }); continue; }
    if (!cur.teacher && r.teacher) cur.teacher = r.teacher;
    if (!cur.chapter && r.chapter) cur.chapter = r.chapter;
    cur.has_notes_pdf ||= r.has_notes_pdf;
    cur.has_smart_notes ||= r.has_smart_notes;
    cur.attended_seconds = Math.max(cur.attended_seconds, r.attended_seconds);
  }
  return [...map.values()];
}

export function parseTestListings(json: unknown, status: TestStatus, enrollmentId: string): TestRow[] {
  if (!Array.isArray(json)) return [];
  const rows: TestRow[] = [];
  for (const raw of json) {
    const c = ((raw as Raw)?.contentInfo ?? raw) as Raw;
    const contentId = id(c.id);
    if (!contentId) continue;
    const meta = (c.metadata ?? {}) as Raw;
    const attempts = Array.isArray(meta.testAttempts) ? (meta.testAttempts as Raw[]) : [];
    const last = attempts[attempts.length - 1];
    const evaluated = !!last && /EVALUATE/.test(str(last.attemptState, 60));
    const duration = num(meta.duration);
    const series = Array.isArray(meta.testSeries) ? (meta.testSeries as unknown[]).filter((x) => typeof x === "string").join(", ") : "";
    rows.push({
      enrollment_id: enrollmentId,
      content_id: contentId,
      test_id: id(meta.testId) || id(c.testId),
      title: str(c.contentTitle, 300) || "Test",
      subjects: Array.isArray(c.subjects) ? (c.subjects as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 8) : [],
      status,
      content_state: str(c.contentState, 40),
      opens_at: isoFromMs(meta.minStartTime) ?? (status === "attempted" ? isoFromMs(last?.startTime) : null),
      closes_at: isoFromMs(meta.maxStartTime),
      result_at: isoFromMs(meta.resultDateTime),
      attempted_at: isoFromMs(c.attemptEndTime) ?? isoFromMs(last?.endTime),
      duration_minutes: duration === null ? null : Math.round(duration / 60000),
      total_marks: num(meta.totalMarks) ?? num(last?.totalMarks),
      marks: evaluated ? num(last?.marksAcheived) : null,
      questions: num(meta.noOfQuestions),
      result_url: status === "attempted" ? str(c.studentActionLink, 600) || null : null,
      test_url: str(c.contentLink, 600) || null,
      series,
    });
  }
  return rows;
}

export function parseTestCounts(json: unknown): CourseStats["tests"] {
  const j = (json ?? {}) as Raw;
  const pick = (...keys: string[]) => { for (const k of keys) { const v = num(j[k]); if (v !== null) return v; } return 0; };
  return {
    upcoming: pick("liveAndUpcomingCount", "liveAndUpcomingTestCount"),
    attempted: pick("attemptedCount", "attemptedTestCount"),
    missed: pick("missedCount", "missedTestCount"),
    practice: pick("practiceCount", "practiceTestCount"),
  };
}

export function parseAttendance(json: unknown): CourseStats["attendance"] | undefined {
  const j = (json ?? {}) as Raw;
  const scheduled = num(j.totalClassesScheduled);
  if (scheduled === null) return undefined;
  return {
    percent: Math.round((num(j.attendancePercentage) ?? 0) * 10) / 10,
    scheduled,
    attended: num(j.totalClassesAttended) ?? 0,
    quizzes: num(j.totalQuizzes) ?? 0,
    quizzesAttempted: num(j.totalAttemptedQuizzes) ?? 0,
    quizzesCorrect: num(j.totalCorrectQuizzes) ?? 0,
  };
}

export function parseHomework(json: unknown): CourseStats["homework"] | undefined {
  const j = (json ?? {}) as Raw;
  const shared = num(j.totalShared) ?? num(j.totalHomeworkShared);
  if (shared === null) return undefined;
  return { shared, completed: num(j.totalCompleted) ?? num(j.totalHomeworkCompleted) ?? 0 };
}

const MAX_NOTES_CHARS = 60_000;

function stamp(sec: unknown): string {
  const n = num(sec);
  if (n === null || n < 0) return "";
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = Math.floor(n % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Smart notes arrive as an ordered list of timestamped notes; render them as one markdown document. */
export function smartNotesToMarkdown(json: unknown): { markdown: string; sections: number } {
  const list = Array.isArray(json) ? json : Array.isArray((json as { notes?: unknown[] })?.notes) ? (json as { notes: unknown[] }).notes : [];
  const parts: string[] = [];
  let section = "";
  let sections = 0;
  for (const raw of list) {
    const n = raw as Raw;
    if (str(n.type, 40).toLowerCase() === "promotional") continue;
    const body = typeof n.markdown === "string" ? n.markdown.trim() : "";
    if (!body) continue;
    const sec = str(n.sectionTitle, 200);
    if (sec && sec !== section) { section = sec; sections += 1; parts.push(`## ${sec}`); }
    const title = str(n.noteTitle, 200);
    const at = typeof n.timeStamp === "string" ? n.timeStamp.trim().slice(0, 12) : stamp(n.timeStamp);
    if (title) parts.push(`### ${title}${at ? ` · ${at}` : ""}`);
    parts.push(body);
  }
  let markdown = parts.join("\n\n");
  if (markdown.length > MAX_NOTES_CHARS) markdown = `${markdown.slice(0, MAX_NOTES_CHARS)}\n\n_…notes shortened._`;
  return { markdown, sections };
}

export function notesPdfUrl(sessionId: string): string {
  return `https://prod-recordings.vedantu.com/NOTES/PROD/${encodeURIComponent(sessionId)}.pdf`;
}

/** Accepts a 10-digit Indian mobile (with or without +91/0) or an email. */
export function normalizeLoginId(raw: string): { phone: string } | { email: string } | null {
  const v = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { email: v.toLowerCase() };
  const digits = v.replace(/\D/g, "");
  const phone = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(phone) ? { phone } : null;
}

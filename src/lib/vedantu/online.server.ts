import { VEDANTU, VedantuError, pool, vget, vpost, vedantuSession } from './api.server';
import { parseEnrollments, parseBatches, parseScheduledSessions, parseTestListings, parseTestCounts, mergeClassRows, smartNotesToMarkdown, smartNotesToLecture, parseLectureTopics, notesPdfUrl, type LectureNote, type LectureTopic, type CourseRow, type BatchRef, type ClassRow, type TestRow, type CourseStats } from './parse';

const CLASS_PAGE = 50;

function deriveTestStatus(t: TestRow, now = Date.now()): TestRow['status'] {
  if (t.attempted_at || t.marks !== null) return 'attempted';
  if (t.closes_at && Date.parse(t.closes_at) < now) return 'missed';
  if (t.opens_at || t.closes_at) return 'upcoming';
  return 'practice';
}
const CLASS_PAST_PAGES = 12; // up to 600 past classes per batch
const CLASS_UPCOMING_PAGES = 4;

export type OnlineCourse = CourseRow & { batches: BatchRef[]; stats: CourseStats; synced_at: string };

/** Private online reads only. No database dependency or durable content cache. */
export async function fetchOnlineCourses(): Promise<OnlineCourse[]> {
  const courses = parseEnrollments(await vget(VEDANTU.enrollments, { userId: '{userId}', needEndedBundleEnrollments: 'false', callingUserId: '{userId}' }));
  if (!courses.length) throw new VedantuError('Vedantu returned no enrolled courses for this account.', 'http');
  const results = await pool(courses, 3, async (course) => ({ ...course,
    batches: parseBatches(await vget(VEDANTU.batches, { userId: '{userId}', bundleEnrollmentId: course.enrollment_id, classroomId: course.classroom_id, callingUserId: '{userId}' })),
    stats: {}, synced_at: new Date().toISOString(),
  }));
  return results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}

export async function fetchOnlineCourse(course: OnlineCourse) {
  const session = await vedantuSession();
  const contexts = [course.classroom_id, ...course.batches.map(b => b.batchId)].filter(Boolean);
  const classes: ClassRow[] = [];
  const tests: TestRow[] = [];
  const allTests: TestRow[] = [];
  let warnings = 0;
  const jobs: (() => Promise<void>)[] = [async () => {
    const counts = parseTestCounts(await vpost(VEDANTU.testCounts, { contextIds: contexts }));
    if (counts) course.stats.tests = counts;
  }, async () => {
    // Only upcoming tests, not attempted/missed/practice history.
    for (let page = 0; page < 8; page++) {
      const json = await vpost(VEDANTU.testListings, { contentFilterType: 'LIVEANDUPCOMING', contextIds: contexts, size: 50, start: page * 50, excludeUnscheduledTests: true });
      if (!Array.isArray(json)) throw new Error('Vedantu test list was unavailable.');
      tests.push(...parseTestListings(json, 'upcoming', course.enrollment_id));
      if (json.length < 50) return;
    }
    warnings += 1;
  }, async () => {
    // Full test list (attempted, missed, practice, PYQ, HWT/DPP) for the categories view.
    for (let page = 0; page < 6; page++) {
      const json = await vpost(VEDANTU.testListings, { contentFilterType: 'ALL', contextIds: contexts, size: 50, start: page * 50 });
      if (!Array.isArray(json)) throw new Error('Vedantu test list was unavailable.');
      allTests.push(...parseTestListings(json, 'practice', course.enrollment_id).map(t => ({ ...t, status: deriveTestStatus(t) })));
      if (json.length < 50) return;
    }
    warnings += 1;
  }];
  for (const batch of course.batches) {
    // Page through each list until Vedantu returns a short page, so classes are not cut at 15/40.
    for (const state of ['LIVE_UPCOMING', 'PAST'] as const) jobs.push(async () => {
      const maxPages = state === 'PAST' ? CLASS_PAST_PAGES : CLASS_UPCOMING_PAGES;
      for (let page = 0; page < maxPages; page++) {
        const json = await vpost(VEDANTU.scheduled, { startTime: null, endTime: null, query: '', contextIds: [batch.batchId], sessionState: null, sessionStatus: state, limit: CLASS_PAGE, start: page * CLASS_PAGE });
        const list = Array.isArray(json) ? json : (json as { list?: unknown[] } | null)?.list;
        if (!Array.isArray(list)) throw new Error('Vedantu class list was unavailable.');
        const parsed = parseScheduledSessions(json, { enrollmentId: course.enrollment_id, batchId: batch.batchId, subject: batch.subject, studentId: session.userId, teachers: new Map() });
        classes.push(...parsed.rows);
        if (list.length < CLASS_PAGE) return;
      }
      warnings += 1;
    });
  }
  const results = await pool(jobs, 3, job => job());
  warnings += results.filter(r => r.status === 'rejected').length;
  return { classes: mergeClassRows(classes, []), tests: [...new Map(tests.map(t => [t.content_id, t])).values()], allTests: [...new Map(allTests.map(t => [t.content_id, t])).values()], warnings };
}

export async function fetchOnlineOverview(now = new Date()) {
  const courses = await fetchOnlineCourses();
  // Two courses at once, each using at most three outbound connections.
  const results = await pool(courses, 2, fetchOnlineCourse);
  const classes: (ClassRow & { course_title: string })[] = [];
  const tests: TestRow[] = [];
  const allTests: TestRow[] = [];
  let warnings = 0;
  results.forEach((result, i) => {
    if (result.status === 'rejected') { warnings += 1; return; }
    warnings += result.value.warnings;
    classes.push(...result.value.classes.map(c => ({ ...c, course_title: courses[i]?.title ?? '' })));
    tests.push(...result.value.tests);
    allTests.push(...result.value.allTests);
  });
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const start = new Date(`${day}T00:00:00+05:30`).getTime();
  const sorted = classes.sort((a,b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''));
  const testStats = { upcoming: 0, attempted: 0, missed: 0, practice: 0 };
  for (const c of courses) for (const key of Object.keys(testStats) as (keyof typeof testStats)[]) testStats[key] += c.stats.tests?.[key] ?? 0;
  return { courses, sync: { status: warnings ? 'error' : 'ok', message: warnings ? 'Vedantu ka kuch data unavailable ya limited hai; poori history nahi dikhayi gayi.' : '', started_at: now.toISOString(), finished_at: new Date().toISOString(), counts: { courses: courses.length, classes: classes.length, tests: tests.length, warnings } },
    todayClasses: sorted.filter(c => c.starts_at && Date.parse(c.starts_at) >= start && Date.parse(c.starts_at) < start + 86400000),
    upcomingClasses: sorted.filter(c => c.starts_at && Date.parse(c.starts_at) >= now.getTime()).slice(0,60),
    recentClasses: sorted.filter(c => c.starts_at && Date.parse(c.starts_at) < now.getTime() && (c.has_smart_notes || c.has_notes_pdf)).reverse().slice(0,60),
    upcomingTests: tests.filter(t => !t.closes_at || Date.parse(t.closes_at) >= now.getTime()).sort((a,b) => (a.opens_at ?? '').localeCompare(b.opens_at ?? '')).slice(0,40), testStats,
    allTests: allTests.sort((a,b) => (b.opens_at ?? b.attempted_at ?? '').localeCompare(a.opens_at ?? a.attempted_at ?? '')).slice(0,600) };
}

export type OnlineLecture = { sessionId: string; notes: LectureNote[]; topics: LectureTopic[]; summary: string; markdown: string; sections: number; pdfUrl: string; smartNotesUrl: string };
const lectureCache = new Map<string, { value: Promise<OnlineLecture>; at: number }>();
const LECTURE_TTL = 30 * 60_000;

/** One lecture (smart notes + slide images + topic outline), fetched live and kept only in worker memory for 30 minutes. */
export function fetchOnlineLecture(sessionId: string): Promise<OnlineLecture> {
  const hit = lectureCache.get(sessionId);
  if (hit && Date.now() - hit.at < LECTURE_TTL) return hit.value;
  const value = (async () => {
    const [raw, tr] = await Promise.all([
      vget(VEDANTU.smartNotes, { sessionId, callingUserId: '{userId}' }),
      vget(VEDANTU.transcript, { sessionId, callingUserId: '{userId}' }).catch(() => null),
    ]);
    const { topics, summary } = parseLectureTopics(tr);
    const md = smartNotesToMarkdown(raw);
    const outline = topics.length ? `## Lecture outline\n${topics.map((t) => `- ${t.at} — ${t.title}`).join('\n')}\n\n` : '';
    return { sessionId, notes: smartNotesToLecture(raw), topics, summary, markdown: outline + md.markdown, sections: md.sections, pdfUrl: notesPdfUrl(sessionId), smartNotesUrl: `https://session.vedantu.com/session-smart-notes/${encodeURIComponent(sessionId)}` };
  })();
  lectureCache.set(sessionId, { value, at: Date.now() });
  value.catch(() => { if (lectureCache.get(sessionId)?.value === value) lectureCache.delete(sessionId); });
  if (lectureCache.size > 30) lectureCache.delete(lectureCache.keys().next().value as string);
  return value;
}

export async function fetchOnlineNotes(sessionId: string) {
  const l = await fetchOnlineLecture(sessionId);
  return { markdown: l.markdown, sections: l.sections, sessionId, pdfUrl: l.pdfUrl, topics: l.topics };
}
const PDF_PROMPT = `These are a Vedantu NEET class's whiteboard slides (handwritten). Transcribe every page as markdown with a "## Page N" heading: headings, points, arrows as →, formulas/equations in LaTeX ($$...$$), and diagrams described by their labels. Write [unclear] for unreadable bits. Output only the transcription.`;
const pdfCache = new Map<string, { text: string; at: number }>();

/** Reads the class whiteboard PDF with the vision model. Kept only in worker memory for an hour, never stored. */
export async function fetchOnlinePdfNotes(sessionId: string): Promise<string> {
  const hit = pdfCache.get(sessionId);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.text;
  const { getAiPause } = await import('@/lib/ai/pause.server');
  if (await getAiPause()) throw new Error('AI is paused.');
  const { gatewayChatText } = await import('@/lib/gateway-chat.server');
  const { VISION_MODEL } = await import('@/lib/verify');
  const text = (await gatewayChatText({ model: VISION_MODEL, messages: [{ role: 'user', content: [{ type: 'text', text: PDF_PROMPT }, { type: 'image_url', image_url: { url: notesPdfUrl(sessionId) } }] }] })).trim();
  if (text) { pdfCache.set(sessionId, { text, at: Date.now() }); if (pdfCache.size > 20) pdfCache.delete(pdfCache.keys().next().value as string); }
  return text;
}

/**
 * Mirrors the owner's Vedantu "My Courses" into private admin-only tables.
 * Work is split into small steps (start → one course at a time → recent notes → finish) so each
 * server call stays inside the runtime's outbound-connection and time limits; a database lease
 * keeps two syncs from running at once.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { VEDANTU, VedantuError, pool, vget, vpost, vedantuSession } from "./api.server";
import {
  TEST_FILTERS,
  mergeClassRows,
  parseAttendance,
  parseBatches,
  parseChapterSessions,
  parseEnrollments,
  parseHomework,
  parseScheduledSessions,
  parseTestCounts,
  parseTestListings,
  smartNotesToMarkdown,
  type BatchRef,
  type ClassRow,
  type CourseStats,
  type TestRow,
} from "./parse";

type Admin = SupabaseClient<Database>;

const LEASE_MS = 10 * 60 * 1000;
const PAGE = 50;
const MAX_TEST_PAGES = 8;
const RECENT_NOTES_DAYS = 21;
const PARALLEL = 5;

export class SyncBusyError extends Error {
  constructor() { super("A Vedantu sync is already running. Wait for it to finish."); this.name = "SyncBusyError"; }
}

export function friendlySyncError(e: unknown): string {
  if (e instanceof SyncBusyError) return e.message;
  if (e instanceof VedantuError) return e.message;
  return e instanceof Error && e.message ? e.message.slice(0, 300) : "Vedantu sync failed.";
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

/** Confirms the caller still owns the lease, extends it, and returns the database clock. */
async function holdLease(admin: Admin, leaseId: string, message: string): Promise<string> {
  const { data, error } = await admin
    .from("vedantu_sync_state")
    .update({ lease_until: new Date(Date.now() + LEASE_MS).toISOString(), message })
    .eq("id", "main")
    .eq("lease_id", leaseId)
    .select("updated_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This sync was replaced by a newer one. Start it again.");
  return data.updated_at;
}

export async function startSync(admin: Admin): Promise<{ leaseId: string; courses: { enrollment_id: string; title: string }[] }> {
  const leaseId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: got, error } = await admin
    .from("vedantu_sync_state")
    .update({ status: "running", lease_id: leaseId, lease_until: new Date(Date.now() + LEASE_MS).toISOString(), started_at: now, message: "Reading My Courses", counts: {} })
    .eq("id", "main")
    .or(`lease_until.is.null,lease_until.lt.${now}`)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!got) throw new SyncBusyError();

  try {
    const enrolled = parseEnrollments(
      await vget(VEDANTU.enrollments, { userId: "{userId}", needEndedBundleEnrollments: "false", callingUserId: "{userId}" }),
    );
    if (!enrolled.length) throw new VedantuError("Vedantu returned no enrolled courses for this account.", "http");
    const batchLists = await pool(enrolled, PARALLEL, (c) =>
      vget(VEDANTU.batches, { userId: "{userId}", bundleEnrollmentId: c.enrollment_id, classroomId: c.classroom_id, callingUserId: "{userId}" }),
    );
    const { data: existing } = await admin.from("vedantu_courses").select("enrollment_id, batches");
    const prior = new Map((existing ?? []).map((r) => [r.enrollment_id, r.batches]));
    const rows = enrolled.map((c, i) => {
      const res = batchLists[i];
      const batches: BatchRef[] | Json = res?.status === "fulfilled" ? parseBatches(res.value) : (prior.get(c.enrollment_id) ?? []);
      return { ...c, batches: batches as Json };
    });
    const { error: upErr } = await admin.from("vedantu_courses").upsert(rows, { onConflict: "enrollment_id" });
    if (upErr) throw new Error(upErr.message);
    const ids = rows.map((r) => r.enrollment_id);
    await admin.from("vedantu_courses").update({ status: "REMOVED" }).not("enrollment_id", "in", `(${ids.join(",")})`);
    return { leaseId, courses: rows.map((r) => ({ enrollment_id: r.enrollment_id, title: r.title })) };
  } catch (e) {
    await finishSync(admin, leaseId, { ok: false, message: friendlySyncError(e) });
    throw e;
  }
}

async function listTests(contexts: string[], filter: string, status: TestRow["status"], enrollmentId: string): Promise<TestRow[]> {
  const out: TestRow[] = [];
  for (let page = 0; page < MAX_TEST_PAGES; page++) {
    const json = await vpost(VEDANTU.testListings, { contentFilterType: filter, contextIds: contexts, size: PAGE, start: page * PAGE, excludeUnscheduledTests: true });
    const rows = parseTestListings(json, status, enrollmentId);
    out.push(...rows);
    if (!Array.isArray(json) || json.length < PAGE) break;
  }
  return out;
}

export async function syncCourse(admin: Admin, leaseId: string, enrollmentId: string): Promise<{ classes: number; tests: number; warnings: number }> {
  const { data: course, error } = await admin.from("vedantu_courses").select("*").eq("enrollment_id", enrollmentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) throw new Error("This course is no longer in My Courses.");
  const cutoff = await holdLease(admin, leaseId, `Syncing ${course.title}`);
  const session = await vedantuSession();
  const batches = (Array.isArray(course.batches) ? course.batches : []) as unknown as BatchRef[];
  const contexts = [course.classroom_id, ...batches.map((b) => b.batchId)].filter(Boolean);
  let warnings = 0;

  // 1) Lightweight summaries (counts, attendance, homework) plus the scheduled lists that carry teacher names.
  type Job = { key: string; run: () => Promise<unknown> };
  const jobs: Job[] = [{ key: "counts", run: () => vpost(VEDANTU.testCounts, { contextIds: contexts }) }];
  if (batches.length) {
    jobs.push({ key: "attendance", run: () => vget(VEDANTU.attendance, { bundleEnrollmentId: enrollmentId, studentId: session.userId, classroomId: course.classroom_id }) });
    jobs.push({ key: "homework", run: () => vpost(VEDANTU.homework, { studentId: Number(session.userId), classroomId: course.classroom_id, bundleEnrollmentId: enrollmentId, fromDate: null, toDate: null }) });
    for (const b of batches) {
      for (const state of ["LIVE_UPCOMING", "PAST"] as const) {
        jobs.push({ key: `sched:${state}:${b.batchId}`, run: () => vpost(VEDANTU.scheduled, { startTime: null, endTime: null, query: "", contextIds: [b.batchId], sessionState: null, sessionStatus: state, limit: state === "PAST" ? 30 : 40, start: 0 }) });
      }
    }
  }
  const first = await pool(jobs, PARALLEL, (j) => j.run());
  const result = new Map<string, unknown>();
  first.forEach((r, i) => { if (r.status === "fulfilled") result.set(jobs[i]!.key, r.value); else warnings += 1; });

  const stats: CourseStats = {};
  const countsParsed = parseTestCounts(result.get("counts"));
  if (result.has("counts") && countsParsed) stats.tests = countsParsed;
  const att = parseAttendance(result.get("attendance"));
  if (att) stats.attendance = att;
  const hw = parseHomework(result.get("homework"));
  if (hw) stats.homework = hw;

  const teachers = new Map<string, string>();
  const scheduledRows: ClassRow[] = [];
  for (const b of batches) {
    for (const state of ["LIVE_UPCOMING", "PAST"]) {
      const json = result.get(`sched:${state}:${b.batchId}`);
      if (json === undefined) continue;
      const parsed = parseScheduledSessions(json, { enrollmentId, batchId: b.batchId, subject: b.subject, studentId: session.userId, teachers });
      parsed.teachers.forEach((v, k) => teachers.set(k, v));
      scheduledRows.push(...parsed.rows);
    }
  }

  // 2) Full chapter-wise class lists and every test list that has items.
  const counts = stats.tests;
  const testJobs = TEST_FILTERS.filter((f) => !counts || (counts[f.status] ?? 0) > 0);
  const second = await pool<{ kind: "chapters"; batch: BatchRef } | { kind: "tests"; filter: string; status: TestRow["status"] }, unknown>(
    [
      ...batches.map((batch) => ({ kind: "chapters" as const, batch })),
      ...testJobs.map((f) => ({ kind: "tests" as const, filter: f.filter, status: f.status })),
    ],
    PARALLEL,
    async (job) => job.kind === "chapters"
      ? parseChapterSessions(await vget(VEDANTU.chapterSessions, { batchId: job.batch.batchId }), { enrollmentId, batchId: job.batch.batchId, subject: job.batch.subject, studentId: session.userId, teachers })
      : listTests(contexts, job.filter, job.status, enrollmentId),
  );
  const chapterRows: ClassRow[] = [];
  const tests: TestRow[] = [];
  let classesComplete = true;
  let testsComplete = !!counts;
  second.forEach((r, i) => {
    const isChapters = i < batches.length;
    if (r.status === "rejected") { warnings += 1; if (isChapters) classesComplete = false; else testsComplete = false; return; }
    if (isChapters) chapterRows.push(...(r.value as ClassRow[])); else tests.push(...(r.value as TestRow[]));
  });
  if (first.some((r, i) => r.status === "rejected" && jobs[i]!.key.startsWith("sched:"))) classesComplete = false;

  const classes = mergeClassRows(chapterRows, scheduledRows);
  // A test can show up under two filters while Vedantu updates; keep the most advanced status.
  const rank: Record<TestRow["status"], number> = { attempted: 4, missed: 3, upcoming: 2, practice: 1 };
  const testMap = new Map<string, TestRow>();
  for (const t of tests) { const cur = testMap.get(t.content_id); if (!cur || rank[t.status] > rank[cur.status]) testMap.set(t.content_id, t); }
  const testRows = [...testMap.values()];

  await chunked(classes, 400, async (part) => {
    const { error: e } = await admin.from("vedantu_classes").upsert(part, { onConflict: "enrollment_id,session_id" });
    if (e) throw new Error(e.message);
  });
  await chunked(testRows, 400, async (part) => {
    const { error: e } = await admin.from("vedantu_tests").upsert(part, { onConflict: "enrollment_id,content_id" });
    if (e) throw new Error(e.message);
  });
  // Rows not touched by this run were removed on Vedantu; only prune when every list came back.
  if (classesComplete) await admin.from("vedantu_classes").delete().eq("enrollment_id", enrollmentId).lt("updated_at", cutoff);
  if (testsComplete) await admin.from("vedantu_tests").delete().eq("enrollment_id", enrollmentId).lt("updated_at", cutoff);

  const { error: cErr } = await admin.from("vedantu_courses").update({ stats: stats as Json, synced_at: new Date().toISOString() }).eq("enrollment_id", enrollmentId);
  if (cErr) throw new Error(cErr.message);
  return { classes: classes.length, tests: testRows.length, warnings };
}

export async function fetchAndStoreNotes(admin: Admin, sessionId: string, title: string): Promise<{ markdown: string; sections: number }> {
  const json = await vget(VEDANTU.smartNotes, { sessionId, callingUserId: "{userId}" });
  const notes = smartNotesToMarkdown(json);
  const { error } = await admin.from("vedantu_class_notes").upsert(
    { session_id: sessionId, title: title.slice(0, 300), markdown: notes.markdown, sections: notes.sections, fetched_at: new Date().toISOString() },
    { onConflict: "session_id" },
  );
  if (error) throw new Error(error.message);
  return notes;
}

/** Pre-fetches smart notes for recent classes, a few per call; older ones load when opened. */
export async function syncRecentNotes(admin: Admin, leaseId: string, limit = 8): Promise<{ fetched: number; remaining: number; failed: number }> {
  await holdLease(admin, leaseId, "Saving recent class notes");
  const since = new Date(Date.now() - RECENT_NOTES_DAYS * 86400000).toISOString();
  const { data: recent, error } = await admin
    .from("vedantu_classes")
    .select("session_id, title")
    .eq("has_smart_notes", true)
    .gte("starts_at", since)
    .lte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const unique = [...new Map((recent ?? []).map((r) => [r.session_id, r])).values()];
  if (!unique.length) return { fetched: 0, remaining: 0, failed: 0 };
  const { data: have } = await admin.from("vedantu_class_notes").select("session_id").in("session_id", unique.map((r) => r.session_id));
  const done = new Set((have ?? []).map((r) => r.session_id));
  const missing = unique.filter((r) => !done.has(r.session_id));
  const batch = missing.slice(0, Math.max(1, Math.min(limit, 12)));
  const res = await pool(batch, 4, (r) => fetchAndStoreNotes(admin, r.session_id, r.title));
  const failed = res.filter((r) => r.status === "rejected").length;
  return { fetched: batch.length - failed, remaining: Math.max(0, missing.length - batch.length), failed };
}

export async function finishSync(admin: Admin, leaseId: string, result: { ok: boolean; message: string; counts?: Record<string, number> }) {
  await admin
    .from("vedantu_sync_state")
    .update({
      status: result.ok ? "ok" : "error",
      finished_at: new Date().toISOString(),
      message: result.message.slice(0, 500),
      ...(result.counts ? { counts: result.counts as Json } : {}),
      lease_id: null,
      lease_until: null,
    })
    .eq("id", "main")
    .eq("lease_id", leaseId);
}

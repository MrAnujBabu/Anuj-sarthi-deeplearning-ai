/**
 * Admin-only RPCs for the "Mera Batch" page. Every function verifies the caller is an admin
 * (server-side has_role) and then uses the service-role client, because the Vedantu mirror
 * tables are read-only for authenticated users. Vedantu/sync modules are imported lazily so
 * they never ship to the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Access denied");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type BatchClass = {
  enrollment_id: string;
  session_id: string;
  batch_id: string;
  subject: string;
  chapter: string;
  title: string;
  teacher: string;
  starts_at: string | null;
  ends_at: string | null;
  attended_seconds: number;
  has_notes_pdf: boolean;
  has_smart_notes: boolean;
  course_title?: string;
};

export type BatchTest = {
  enrollment_id: string;
  content_id: string;
  title: string;
  subjects: string[];
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  marks: number | null;
  total_marks: number | null;
  questions: number | null;
  duration_minutes: number | null;
  test_url: string | null;
  series: string;
};

export const getBatchOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const now = new Date();
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const dayStart = new Date(`${day}T00:00:00+05:30`);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const nowIso = now.toISOString();

    const [courses, sync, today, upcoming, recent, tests, testRows] = await Promise.all([
      admin.from("vedantu_courses").select("enrollment_id,title,course_type,status,valid_till,batches,stats,synced_at").order("title"),
      admin.from("vedantu_sync_state").select("status,message,started_at,finished_at,counts").eq("id", "main").maybeSingle(),
      admin.from("vedantu_classes").select("*").gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString()).order("starts_at"),
      admin.from("vedantu_classes").select("*").gte("starts_at", nowIso).order("starts_at").limit(40),
      admin.from("vedantu_classes").select("*").lte("starts_at", nowIso).eq("has_smart_notes", true).order("starts_at", { ascending: false }).limit(15),
      admin.from("vedantu_tests").select("*").eq("status", "upcoming").gte("closes_at", nowIso).order("opens_at").limit(40),
      admin.from("vedantu_tests").select("status"),
    ]);
    const err = courses.error ?? sync.error ?? today.error ?? upcoming.error ?? recent.error ?? tests.error ?? testRows.error;
    if (err) throw new Error(err.message);

    const titleOf = new Map((courses.data ?? []).map((c) => [c.enrollment_id, c.title]));
    const withCourse = (rows: any[] | null): BatchClass[] =>
      (rows ?? []).map((r) => ({ ...r, course_title: titleOf.get(r.enrollment_id) ?? "" }));

    const testStats = { upcoming: 0, attempted: 0, missed: 0, practice: 0 };
    for (const r of testRows.data ?? []) {
      const k = r.status as keyof typeof testStats;
      if (k in testStats) testStats[k] += 1;
    }

    return {
      courses: courses.data ?? [],
      sync: sync.data ?? null,
      todayClasses: withCourse(today.data),
      upcomingClasses: withCourse(upcoming.data),
      recentClasses: withCourse(recent.data),
      upcomingTests: (tests.data ?? []) as BatchTest[],
      testStats,
    };
  });

export const startBatchSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const { startSync } = await import("./sync.server");
    return startSync(admin);
  });

export const syncBatchCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leaseId: string; enrollmentId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const { syncCourse } = await import("./sync.server");
    return syncCourse(admin, data.leaseId, data.enrollmentId);
  });

export const syncBatchNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leaseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const { syncRecentNotes } = await import("./sync.server");
    return syncRecentNotes(admin, data.leaseId, 8);
  });

export const finishBatchSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leaseId: string; ok: boolean; message: string; counts?: Record<string, number> }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const { finishSync } = await import("./sync.server");
    await finishSync(admin, data.leaseId, { ok: data.ok, message: data.message.slice(0, 300), ...(data.counts ? { counts: data.counts } : {}) });
    return { ok: true };
  });

/** Smart-notes markdown for one class; fetches from Vedantu on first view and caches it. */
export const getClassNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const admin = await adminClient();
    const { data: cached } = await admin.from("vedantu_class_notes").select("markdown,sections").eq("session_id", data.sessionId).maybeSingle();
    if (cached?.markdown) return { markdown: cached.markdown, cached: true };
    const { data: cls } = await admin.from("vedantu_classes").select("has_smart_notes").eq("session_id", data.sessionId).maybeSingle();
    if (!cls?.has_smart_notes) return { markdown: "", cached: false };
    const { fetchAndStoreNotes, friendlySyncError } = await import("./sync.server");
    try {
      const notes = await fetchAndStoreNotes(admin, data.sessionId, data.title);
      return { markdown: notes.markdown, cached: false };
    } catch (e) {
      throw new Error(friendlySyncError(e));
    }
  });

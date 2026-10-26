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
    const { fetchOnlineOverview } = await import("./online.server");
    return fetchOnlineOverview();
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

/** Smart notes fetched on demand, never stored in the database. */
export const getClassNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; title: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { fetchOnlineNotes } = await import("./online.server");
    const notes = await fetchOnlineNotes(data.sessionId);
    return { markdown: notes.markdown, sections: notes.sections, sessionId: notes.sessionId, pdfUrl: notes.pdfUrl, cached: false };
  });

/** One lecture as an in-app viewer: timestamped smart-note sections, slide images and topic outline. Live, never stored. */
export const getLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => {
    if (typeof d?.sessionId !== "string" || !/^[a-zA-Z0-9]{8,40}$/.test(d.sessionId)) throw new Error("Invalid session id");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { fetchOnlineLecture } = await import("./online.server");
    const l = await fetchOnlineLecture(data.sessionId);
    return { sessionId: l.sessionId, notes: l.notes, topics: l.topics, summary: l.summary, pdfUrl: l.pdfUrl, smartNotesUrl: l.smartNotesUrl };
  });

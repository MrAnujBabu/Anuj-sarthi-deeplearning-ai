/**
 * Reads the owner's Vedantu "My Courses" online without persisting content.
 * Work is split into small steps (start → one course at a time → recent notes → finish) so each
 * server call stays inside the runtime's outbound-connection and time limits; a database lease
 * keeps two syncs from running at once.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { VedantuError } from "./api.server";

type Admin = SupabaseClient<Database>;

const LEASE_MS = 10 * 60 * 1000;

export class SyncBusyError extends Error {
  constructor() { super("A Vedantu sync is already running. Wait for it to finish."); this.name = "SyncBusyError"; }
}

export function friendlySyncError(e: unknown): string {
  if (e instanceof SyncBusyError) return e.message;
  if (e instanceof VedantuError) return e.message;
  return e instanceof Error && e.message ? e.message.slice(0, 300) : "Vedantu sync failed.";
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
    const { fetchOnlineCourses } = await import('./online.server');
    const courses = await fetchOnlineCourses();
    return { leaseId, courses: courses.map(c => ({ enrollment_id: c.enrollment_id, title: c.title })) };
  } catch (e) {
    await finishSync(admin, leaseId, { ok: false, message: friendlySyncError(e) });
    throw e;
  }
}

/** Scheduled fetch checks online data; only lease/status metadata is persisted. */
export async function syncCourse(admin: Admin, leaseId: string, enrollmentId: string): Promise<{ classes: number; tests: number; warnings: number }> {
  await holdLease(admin, leaseId, 'Reading online course');
  const { fetchOnlineCourses, fetchOnlineCourse } = await import('./online.server');
  const course = (await fetchOnlineCourses()).find(c => c.enrollment_id === enrollmentId);
  if (!course) throw new Error('This course is no longer in My Courses.');
  const result = await fetchOnlineCourse(course);
  return { classes: result.classes.length, tests: result.tests.length, warnings: result.warnings };
}

/** Compatibility wrapper: online notes are no longer stored. */
export async function fetchAndStoreNotes(_admin: Admin, sessionId: string, _title: string) {
  const { fetchOnlineNotes } = await import('./online.server');
  return fetchOnlineNotes(sessionId);
}

export async function syncRecentNotes(admin: Admin, leaseId: string, _limit = 8): Promise<{ fetched: number; remaining: number; failed: number }> {
  await holdLease(admin, leaseId, 'Online refresh complete; notes load on demand');
  return { fetched: 0, remaining: 0, failed: 0 };
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

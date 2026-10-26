/**
 * Server-only Vedantu client. Logs in with the owner's saved secrets, keeps the session token
 * only in this worker's memory (never in the database, logs or responses) and re-logs once on 401.
 */
import { normalizeLoginId } from "./parse";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const LOGIN_URL = "https://user.vedantu.com/user/login/authenticateUser";
const WEB_VERSION = "1792065262";
const TIMEOUT_MS = 25_000;
/** Vedantu web sessions last far longer; refresh well before that so a long sync never straddles expiry. */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export const VEDANTU = {
  enrollments: "https://subscription.vedantu.com/subscription/bundle-enrolment/v2/getBundleEnrolmentByUserId",
  batches: "https://subscription.vedantu.com/subscription/enroll/v2/getCoursesByBundleId",
  testCounts: "https://lms.vedantu.com/lms/cmds/contentInfo/v2/getTestListingCounts",
  testListings: "https://lms.vedantu.com/lms/cmds/contentInfo/v2/getTestListings",
  chapterSessions: "https://scheduling.vedantu.com/scheduling/onetofew/session/getChapterWiseSessions",
  scheduled: "https://scheduling.vedantu.com/scheduling/onetofew/session/v2/getScheduledSessionsForStudent",
  attendance: "https://scheduling.vedantu.com/scheduling/attendance-aggregate/getLatestAttendanceQuizData",
  homework: "https://lms.vedantu.com/lms/cmds/contentInfo/getHomeworkData",
  smartNotes: "https://scheduling.vedantu.com/scheduling/replay-session/smart-notes",
  transcript: "https://scheduling.vedantu.com/scheduling/replay-session/transcript-data",
} as const;

export type VedantuErrorKind = "config" | "login" | "auth" | "http" | "network";

export class VedantuError extends Error {
  constructor(message: string, readonly kind: VedantuErrorKind, readonly status?: number) {
    super(message);
    this.name = "VedantuError";
  }
}

type Session = { token: string; userId: string; at: number };
let cached: Session | null = null;
let pending: Promise<Session> | null = null;

function tokenFrom(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  for (const line of cookies) {
    const m = /(?:^|[;,\s])X-Ved-Token=([^;,\s]+)/.exec(line);
    if (m?.[1]) return m[1];
  }
  return "";
}

async function login(): Promise<Session> {
  const rawId = process.env["VEDANTU_LOGIN_ID"];
  const password = process.env["VEDANTU_PASSWORD"];
  if (!rawId || !password) throw new VedantuError("Vedantu login is not saved yet.", "config");
  const who = normalizeLoginId(rawId);
  if (!who) throw new VedantuError("Saved Vedantu ID is not a valid mobile number or email.", "config");
  let res: Response;
  try {
    res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.vedantu.com", referer: "https://www.vedantu.com/", "user-agent": UA },
      body: JSON.stringify({ email: "email" in who ? who.email : null, phone: "phone" in who ? who.phone : null, phoneCode: "+91", password, ver: WEB_VERSION }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new VedantuError("Vedantu could not be reached. Try again in a minute.", "network");
  }
  const body = (await res.json().catch(() => null)) as { userId?: unknown; errorCode?: string; message?: string } | null;
  const token = tokenFrom(res);
  const userId = body?.userId !== undefined && body?.userId !== null ? String(body.userId) : "";
  if (!res.ok || !token || !userId) {
    console.error(`Vedantu login failed [${res.status}] ${body?.errorCode ?? ""}`);
    throw new VedantuError(
      res.status === 401 || res.status === 403 || /PASSWORD|CREDENTIAL|USER_NOT_FOUND/i.test(body?.errorCode ?? "")
        ? "Vedantu login was refused. If you changed your Vedantu password, update the saved one."
        : `Vedantu login failed (${res.status}).`,
      "login",
      res.status,
    );
  }
  return { token, userId, at: Date.now() };
}

export async function vedantuSession(force = false): Promise<Session> {
  if (!force && cached && Date.now() - cached.at < SESSION_TTL_MS) return cached;
  if (!pending) {
    pending = login().then((s) => { cached = s; return s; }).finally(() => { pending = null; });
  }
  return pending;
}

export function forgetVedantuSession() {
  cached = null;
}

async function call<T>(method: "GET" | "POST", url: string, opts: { query?: Record<string, string>; body?: unknown } = {}, retried = false): Promise<T> {
  const session = await vedantuSession();
  const u = new URL(url);
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v.replace("{userId}", session.userId));
  let res: Response;
  try {
    res = await fetch(u, {
      method,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://www.vedantu.com",
        referer: "https://www.vedantu.com/",
        "user-agent": UA,
        "X-Ved-Token": session.token,
      },
      ...(method === "POST" ? { body: JSON.stringify(opts.body ?? {}) } : {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new VedantuError("Vedantu did not answer in time.", "network");
  }
  if ((res.status === 401 || res.status === 403) && !retried) {
    await res.body?.cancel().catch(() => {});
    await vedantuSession(true);
    return call<T>(method, url, opts, true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Vedantu ${method} ${u.pathname} failed [${res.status}]: ${text.slice(0, 300)}`);
    throw new VedantuError(`Vedantu request failed (${res.status}).`, res.status === 401 || res.status === 403 ? "auth" : "http", res.status);
  }
  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new VedantuError("Vedantu sent an unreadable reply.", "http", res.status);
  }
}

export const vget = <T = unknown>(url: string, query?: Record<string, string>) => call<T>("GET", url, query ? { query } : {});
export const vpost = <T = unknown>(url: string, body: unknown, query?: Record<string, string>) => call<T>("POST", url, query ? { body, query } : { body });

/** Run async jobs with at most `limit` in flight (the runtime allows 6 outbound connections). */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = { status: "fulfilled", value: await fn(items[i] as T) }; }
      catch (reason) { out[i] = { status: "rejected", reason }; }
    }
  });
  await Promise.all(workers);
  return out;
}

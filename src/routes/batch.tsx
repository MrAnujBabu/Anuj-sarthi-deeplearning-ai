import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/memory.functions";
import {
  getBatchOverview,
  startBatchSync,
  syncBatchCourse,
  syncBatchNotes,
  finishBatchSync,
  getClassNotes,
  type BatchClass,
  type BatchTest,
} from "@/lib/vedantu/batch.functions";
import { pendingFirstMessage } from "@/lib/threads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/batch")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mera Batch — SnapSolve" },
      { name: "description", content: "Private Vedantu batch mirror: schedule, tests, class notes and tutor launch." },
      { property: "og:title", content: "Mera Batch — SnapSolve" },
      { property: "og:description", content: "Private Vedantu batch mirror: schedule, tests, class notes and tutor launch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BatchPage,
});

type Overview = Awaited<ReturnType<typeof getBatchOverview>>;

function istTime(iso: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", ...opts });
}

function BatchPage() {
  const [state, setState] = useState<"loading" | "out" | "denied" | "in">("loading");
  const [data, setData] = useState<Overview | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const check = useServerFn(amIAdmin);
  const load = useServerFn(getBatchOverview);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setState("out");
    try {
      if (!(await check()).admin) return setState("denied");
      setState("in");
      setLoadErr("");
      setData(await load());
    } catch (e) {
      setState("in");
      setLoadErr(e instanceof Error ? e.message : "Batch data load failed.");
    }
  };
  useEffect(() => { refresh(); }, []);

  const runSync = async () => {
    setSyncing(true);
    const start = startBatchSync;
    try {
      setSyncMsg("Vedantu se My Courses padh raha hoon…");
      const { leaseId, courses } = await start();
      let classes = 0, tests = 0, warnings = 0;
      for (const c of courses) {
        setSyncMsg(`Sync: ${c.title}…`);
        try {
          const r = await syncBatchCourse({ data: { leaseId, enrollmentId: c.enrollment_id } });
          classes += r.classes; tests += r.tests; warnings += r.warnings;
        } catch { warnings += 1; }
      }
      setSyncMsg("Recent class notes save kar raha hoon…");
      try { await syncBatchNotes({ data: { leaseId } }); } catch { warnings += 1; }
      await finishBatchSync({ data: { leaseId, ok: true, message: `Synced ${courses.length} courses`, counts: { courses: courses.length, classes, tests, warnings } } });
      setSyncMsg(`Ho gaya: ${courses.length} courses, ${classes} classes, ${tests} tests${warnings ? `, ${warnings} warnings` : ""}.`);
      await refresh();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); setState("out"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/" className="font-display text-xl">SnapSolve <span className="text-muted-foreground text-base">· Mera Batch</span></Link>
        {state === "in" || state === "denied" ? <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button> : null}
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        {state === "loading" && <p className="text-muted-foreground">Loading…</p>}
        {state === "out" && <SignIn onDone={refresh} />}
        {state === "denied" && <p className="text-destructive">Access denied — this account is not an admin.</p>}
        {state === "in" && (
          <div className="space-y-8">
            {loadErr && <p className="text-sm text-destructive">{loadErr}</p>}
            <SyncCard data={data} syncing={syncing} syncMsg={syncMsg} onSync={runSync} />
            {data && (
              <>
                <ClassSection title="Aaj ki classes" classes={data.todayClasses} empty="Aaj koi class nahi hai." />
                <ClassSection title="Aane wali classes" classes={data.upcomingClasses} empty="Koi aane wali class nahi mili." />
                <TestSection tests={data.upcomingTests} stats={data.testStats} />
                <CourseSection courses={data.courses} />
                <ClassSection title="Recent classes (notes ke saath)" classes={data.recentClasses} empty="Recent smart notes nahi mile." />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setErr(error.message === "Invalid login credentials" ? "Galat email ya password." : error.message); else onDone();
      }}
    >
      <h1 className="font-display text-2xl">Admin sign in</h1>
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</Button>
    </form>
  );
}

function SyncCard({ data, syncing, syncMsg, onSync }: { data: Overview | null; syncing: boolean; syncMsg: string; onSync: () => void }) {
  const sync = data?.sync;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          Vedantu sync
          {sync?.status === "running" && <Badge variant="secondary">chal raha hai</Badge>}
          {sync?.status === "ok" && <Badge variant="secondary">theek</Badge>}
          {sync?.status === "error" && <Badge variant="destructive">error</Badge>}
        </CardTitle>
        <CardDescription>
          My Courses se courses, classes, tests aur notes laata hai. Vedantu ka password kahin save nahi hota.
          {sync?.finished_at ? ` Last sync: ${istTime(sync.finished_at)}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncMsg && <p className="text-sm text-muted-foreground">{syncMsg}</p>}
        {!syncMsg && sync?.message && <p className="text-sm text-muted-foreground">{sync.message}</p>}
        <Button onClick={onSync} disabled={syncing}>{syncing ? "Sync chal raha hai…" : "Sync now"}</Button>
      </CardContent>
    </Card>
  );
}

function ClassSection({ title, classes, empty }: { title: string; classes: BatchClass[]; empty: string }) {
  const navigate = useNavigate();
  const notesFn = useServerFn(getClassNotes);
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesErr, setNotesErr] = useState("");
  const [busy, setBusy] = useState(false);

  const launch = (c: BatchClass, mode: "solve" | "quiz") => {
    const n = notes[c.session_id]?.slice(0, mode === "quiz" ? 6000 : 8000);
    const head = `"${c.title}" (${[c.subject, c.chapter].filter(Boolean).join(", ")}${c.teacher ? `, teacher ${c.teacher}` : ""})`;
    const text = mode === "quiz"
      ? `Is class ${head} se mujhse MCQ quiz lo.${n ? `\n\nClass ke smart notes (base ye rahein):\n\n${n}` : ""}`
      : `Mujhe class ${head} se padhao.${n ? `\n\nClass ke smart notes:\n\n${n}` : " Class ka topic samjhao aur zaroori points sikhao."}`;
    const id = crypto.randomUUID();
    pendingFirstMessage.set(id, { text, files: [], mode });
    if (mode === "quiz") localStorage.setItem(`snapsolve.quiz.${id}`, "1");
    navigate({ to: "/doubt/$threadId", params: { threadId: id } });
  };

  const openNotes = async (c: BatchClass) => {
    if (open === c.session_id) return setOpen(null);
    setOpen(c.session_id);
    setNotesErr("");
    if (notes[c.session_id] !== undefined) return;
    setBusy(true);
    try {
      const r = await notesFn({ data: { sessionId: c.session_id, title: c.title } });
      setNotes((m) => ({ ...m, [c.session_id]: r.markdown }));
    } catch (e) {
      setNotesErr(e instanceof Error ? e.message : "Notes load nahi hue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      {notesErr && <p className="mb-2 text-sm text-destructive">{notesErr}</p>}
      {!classes.length ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {classes.map((c) => (
            <Card key={`${c.enrollment_id}-${c.session_id}`}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.title || "Class"}</span>
                  {c.subject && <Badge variant="outline">{c.subject}</Badge>}
                  {c.chapter && <Badge variant="outline">{c.chapter}</Badge>}
                  <span className="text-xs text-muted-foreground">{istTime(c.starts_at)}</span>
                  {c.teacher && <span className="text-xs text-muted-foreground">· {c.teacher}</span>}
                  {c.course_title && <span className="ml-auto text-xs text-muted-foreground">{c.course_title}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.has_smart_notes && (
                    <Button variant="outline" size="sm" onClick={() => openNotes(c)} disabled={busy}>
                      {open === c.session_id ? "Notes band karo" : "Notes"}
                    </Button>
                  )}
                  <Button size="sm" onClick={() => launch(c, "solve")}>Is class se padhao</Button>
                  <Button variant="secondary" size="sm" onClick={() => launch(c, "quiz")}>Quiz lo</Button>
                </div>
                {open === c.session_id && (
                  <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs">
                    {notes[c.session_id] || (busy ? "Notes aa rahe hain…" : "Is class ke smart notes nahi mile.")}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function TestSection({ tests, stats }: { tests: BatchTest[]; stats: { upcoming: number; attempted: number; missed: number; practice: number } }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl">Aane wale tests</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Total: {stats.upcoming} upcoming · {stats.attempted} attempted · {stats.missed} missed · {stats.practice} practice
      </p>
      {!tests.length ? (
        <p className="text-sm text-muted-foreground">Koi upcoming test nahi mila.</p>
      ) : (
        <div className="space-y-2">
          {tests.map((t) => (
            <Card key={`${t.enrollment_id}-${t.content_id}`}>
              <CardContent className="flex flex-wrap items-center gap-2 py-3">
                <span className="font-medium">{t.title}</span>
                {t.subjects.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                <span className="text-xs text-muted-foreground">
                  {istTime(t.opens_at)} — {istTime(t.closes_at)}
                  {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
                  {t.questions ? ` · ${t.questions} Q` : ""}
                </span>
                {t.test_url && (
                  <Button variant="ghost" size="sm" asChild className="ml-auto">
                    <a href={t.test_url} target="_blank" rel="noreferrer">Vedantu par kholo</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function CourseSection({ courses }: { courses: Overview["courses"] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl">Mere courses</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((c) => {
          const stats = (c.stats ?? {}) as { tests?: Record<string, number>; attendance?: Record<string, unknown> };
          const attendance = Number((stats.attendance as { attendancePercentage?: unknown } | undefined)?.attendancePercentage ?? NaN);
          const batches = Array.isArray(c.batches) ? (c.batches as { subject?: string }[]) : [];
          return (
            <Card key={c.enrollment_id}>
              <CardContent className="space-y-2 py-4">
                <div className="font-medium">{c.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{c.course_type === "TEST_SERIES" ? "Test series" : "Course"}</Badge>
                  {batches.map((b, i) => b.subject ? <Badge key={i} variant="outline">{b.subject}</Badge> : null)}
                  {c.status !== "ACTIVE" && <Badge variant="destructive">{c.status}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number.isFinite(attendance) ? `Attendance: ${Math.round(attendance)}% · ` : ""}
                  {stats.tests ? `Tests: ${stats.tests["attempted"] ?? 0} attempted, ${stats.tests["missed"] ?? 0} missed · ` : ""}
                  {c.synced_at ? `Synced: ${istTime(c.synced_at)}` : "Abhi sync nahi hua"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

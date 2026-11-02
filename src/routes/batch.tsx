import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/memory.functions";
import {
  getBatchOverview,
  type BatchClass,
  type BatchTest,
} from "@/lib/vedantu/batch.functions";
import { getAitsSchedule, type AitsResult } from "@/lib/vedantu/sheets.functions";
import type { AitsTest } from "@/lib/vedantu/sheets.server";
import { pendingFirstMessage } from "@/lib/threads";
import { LectureViewer } from "@/components/batch/LectureViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { testCategory, smartNotesUrl, notesPdfLink } from "@/lib/vedantu/categories";

export const Route = createFileRoute("/batch")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mera Batch — SnapSolve" },
      { name: "description", content: "Private online Vedantu batches: schedule, tests, class notes and tutor launch." },
      { property: "og:title", content: "Mera Batch — SnapSolve" },
      { property: "og:description", content: "Private online Vedantu batches: schedule, tests, class notes and tutor launch." },
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
  const [aits, setAits] = useState<AitsResult | null>(null);
  const check = useServerFn(amIAdmin);
  const load = useServerFn(getBatchOverview);
  const loadAits = useServerFn(getAitsSchedule);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setState("out");
    try {
      if (!(await check()).admin) return setState("denied");
      setState("in");
      setLoadErr("");
      setData(await load());
      loadAits().then(setAits).catch(() => setAits({ ok: false, error: "AITS sheet load nahi hui." }));
    } catch (e) {
      setState("in");
      setLoadErr(e instanceof Error ? e.message : "Batch data load failed.");
    }
  };
  useEffect(() => { refresh(); }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      setSyncMsg("Vedantu se online data aa raha hai…");
      const fresh = await load();
      setData(fresh);
      setSyncMsg(fresh.sync.message || `Ho gaya: ${fresh.courses.length} courses, ${fresh.todayClasses.length} aaj ki classes. Online data refresh hua.`);
      loadAits().then(setAits).catch(() => setAits({ ok: false, error: "AITS sheet load nahi hui." }));
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
              <BatchBoard data={data} aits={aits} />
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
          Vedantu online
          {sync?.status === "running" && <Badge variant="secondary">chal raha hai</Badge>}
          {sync?.status === "ok" && <Badge variant="secondary">theek</Badge>}
          {sync?.status === "error" && <Badge variant="destructive">error</Badge>}
        </CardTitle>
        <CardDescription>
          
          {sync?.finished_at ? ` Last online fetch: ${istTime(sync.finished_at)}.` : ""}
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

type Cat = "lectures" | "tests" | "dpp" | "pyq" | "aits" | "courses";

function BatchBoard({ data, aits }: { data: Overview; aits: AitsResult | null }) {
  const [course, setCourse] = useState<string>("all");
  const [cat, setCat] = useState<Cat>("lectures");
  const titleOf = useMemo(() => new Map(data.courses.map((c) => [c.enrollment_id, c.title])), [data.courses]);
  const inCourse = <T extends { enrollment_id: string }>(rows: T[]) => (course === "all" ? rows : rows.filter((r) => r.enrollment_id === course));
  const tests = useMemo(() => (data.allTests ?? []).map((t) => ({ ...t, course_title: titleOf.get(t.enrollment_id) ?? "", category: testCategory(t.title, t.series) })), [data.allTests, titleOf]);
  const today = inCourse(data.todayClasses);
  const upcoming = inCourse(data.upcomingClasses).filter((c) => !today.some((t) => t.session_id === c.session_id));
  const recent = inCourse(data.recentClasses);
  const scoped = inCourse(tests);
  const byCat = { tests: scoped.filter((t) => t.category === "test"), dpp: scoped.filter((t) => t.category === "dpp"), pyq: scoped.filter((t) => t.category === "pyq") };
  const counts: Record<Cat, number> = { lectures: today.length + upcoming.length + recent.length, tests: byCat.tests.length, dpp: byCat.dpp.length, pyq: byCat.pyq.length, aits: aits?.ok ? aits.summary.total : 0, courses: course === "all" ? data.courses.length : 1 };
  const tabs: { id: Cat; label: string }[] = [
    { id: "lectures", label: "Lectures" }, { id: "tests", label: "Tests" }, { id: "dpp", label: "DPP / HWT" }, { id: "pyq", label: "PYQ" },
    ...(course === "all" ? [{ id: "aits" as const, label: "AITS" }] : []), { id: "courses", label: "Courses" },
  ];
  const active = tabs.some((t) => t.id === cat) ? cat : "lectures";

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: "all", title: "Sab courses" }, ...data.courses.map((c) => ({ id: c.enrollment_id, title: c.title }))].map((c) => (
          <Button key={c.id} size="sm" variant={course === c.id ? "default" : "outline"} className="shrink-0" onClick={() => setCourse(c.id)}>
            {c.title}
          </Button>
        ))}
      </div>
      <Tabs value={active} onValueChange={(v) => setCat(v as Cat)}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
              {t.label} <span className="text-xs text-muted-foreground">{counts[t.id]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="lectures" className="space-y-8 pt-4">
          <ClassSection title="Aaj ki classes" classes={today} empty="Aaj koi class nahi hai." />
          <ClassSection title="Aane wali classes" classes={upcoming} empty="Koi aane wali class nahi mili." />
          <ClassSection title="Haal ki classes (notes ke saath)" classes={recent} empty="Haal ki classes ke notes nahi mile." />
        </TabsContent>
        <TabsContent value="tests" className="pt-4"><TestSection tests={byCat.tests} empty="Is course mein koi test nahi mila." /></TabsContent>
        <TabsContent value="dpp" className="pt-4"><TestSection tests={byCat.dpp} empty="Is course mein koi DPP / HWT nahi mila." /></TabsContent>
        <TabsContent value="pyq" className="pt-4"><TestSection tests={byCat.pyq} empty="Is course mein koi PYQ paper nahi mila." /></TabsContent>
        <TabsContent value="aits" className="pt-4"><AitsSection data={aits} /></TabsContent>
        <TabsContent value="courses" className="pt-4"><CourseSection courses={course === "all" ? data.courses : data.courses.filter((c) => c.enrollment_id === course)} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ClassSection({ title, classes, empty }: { title: string; classes: BatchClass[]; empty: string }) {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<BatchClass | null>(null);
  const launch = (c: BatchClass, mode: "solve" | "quiz") => {
    const head = `"${c.title}" (${[c.subject, c.chapter].filter(Boolean).join(", ")}${c.teacher ? `, teacher ${c.teacher}` : ""})`;
    const ref = c.has_smart_notes || c.has_notes_pdf ? ` [notes id: ${c.session_id}] — is class ke notes se hi padhana.` : " Class ka topic samjhao aur zaroori points sikhao.";
    const text = mode === "quiz" ? `Is class ${head} se mujhse MCQ quiz lo.${ref}` : `Mujhe class ${head} se padhao.${ref}`;
    const id = crypto.randomUUID();
    pendingFirstMessage.set(id, { text, files: [], mode });
    if (mode === "quiz") localStorage.setItem(`snapsolve.quiz.${id}`, "1");
    navigate({ to: "/doubt/$threadId", params: { threadId: id } });
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">{title} <span className="text-sm font-normal text-muted-foreground">{classes.length}</span></h2>
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
                    <Button variant="outline" size="sm" onClick={() => setViewing(c)}>Lecture kholo</Button>
                  )}
                  {c.session_id && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={smartNotesUrl(c.session_id)} target="_blank" rel="noreferrer" title={`Session ${c.session_id}`}>Vedantu par kholo</a>
                    </Button>
                  )}
                  {c.has_notes_pdf && (
                    <Button asChild variant="outline" size="sm">
                      <a href={notesPdfLink(c.session_id)} target="_blank" rel="noreferrer">PDF notes</a>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => launch(c, "solve")}>Is class se padhao</Button>
                  <Button variant="secondary" size="sm" onClick={() => launch(c, "quiz")}>Quiz lo</Button>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">Session ID: {c.session_id}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {viewing && <LectureViewer sessionId={viewing.session_id} title={viewing.title} open onOpenChange={(o) => !o && setViewing(null)} />}
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = { upcoming: "Upcoming", attempted: "Attempted", missed: "Missed", practice: "Practice" };

function TestSection({ tests, empty }: { tests: (BatchTest & { course_title?: string; status?: string; result_url?: string | null })[]; empty: string }) {
  if (!tests.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {tests.map((t) => (
        <Card key={`${t.enrollment_id}-${t.content_id}`}>
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <span className="font-medium">{t.title}</span>
            {t.status && <Badge variant={t.status === "missed" ? "destructive" : t.status === "upcoming" ? "default" : "secondary"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>}
            {t.subjects.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            <span className="text-xs text-muted-foreground">
              {t.opens_at || t.closes_at ? `${istTime(t.opens_at)} — ${istTime(t.closes_at)}` : ""}
              {t.marks !== null && t.total_marks ? ` · ${t.marks}/${t.total_marks}` : ""}
              {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
              {t.questions ? ` · ${t.questions} Q` : ""}
            </span>
            {t.course_title && <span className="text-xs text-muted-foreground">· {t.course_title}</span>}
            {(t.result_url || t.test_url) && (
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <a href={(t.result_url || t.test_url) as string} target="_blank" rel="noreferrer">{t.result_url ? "Result dekho" : "Vedantu par kholo"}</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
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

function AitsSection({ data }: { data: AitsResult | null }) {
  const navigate = useNavigate();

  const launch = (t: AitsTest, mode: "solve" | "quiz") => {
    const subs = [
      t.subjects.physics && `Physics: ${t.subjects.physics}`,
      t.subjects.chemistry && `Chemistry: ${t.subjects.chemistry}`,
      t.subjects.botany && `Botany: ${t.subjects.botany}`,
      t.subjects.zoology && `Zoology: ${t.subjects.zoology}`,
    ].filter(Boolean).join("\n");
    const head = `"${t.name}" (Eklavya NEET 2027 AITS, ${t.type}${t.dateIso ? `, ${istTime(t.dateIso, { weekday: "short" })}` : ""})`;
    const text = mode === "quiz"
      ? `Mujhse ${head} ka MCQ quiz lo.\n\nTest ka syllabus:\n${subs || t.syllabus}`
      : `Mujhe ${head} ka syllabus padhao.\n\nSyllabus:\n${subs || t.syllabus}`;
    const id = crypto.randomUUID();
    pendingFirstMessage.set(id, { text, files: [], mode });
    if (mode === "quiz") localStorage.setItem(`snapsolve.quiz.${id}`, "1");
    navigate({ to: "/doubt/$threadId", params: { threadId: id } });
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">Eklavya AITS tracker <span className="text-sm font-normal text-muted-foreground">(Google Sheet se live)</span></h2>
      {!data ? (
        <p className="text-sm text-muted-foreground">Sheet padh raha hoon…</p>
      ) : !data.ok ? (
        <p className="text-sm text-destructive">{data.error}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Total: {data.summary.total} tests · {data.summary.done} done · {data.summary.pending} pending
            {data.summary.overdue ? ` · ${data.summary.overdue} overdue` : ""}
          </p>
          {data.nextTest && (
            <Card className="border-primary/40">
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Agla test</Badge>
                  <span className="font-medium">{data.nextTest.name}</span>
                  <Badge variant="outline">{data.nextTest.type}</Badge>
                  <span className="text-xs text-muted-foreground">{istTime(data.nextTest.dateIso, { weekday: "long" })}</span>
                </div>
                <p className="text-xs text-muted-foreground">{data.nextTest.syllabus}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => data.nextTest && launch(data.nextTest, "solve")}>Syllabus padhao</Button>
                  <Button variant="secondary" size="sm" onClick={() => data.nextTest && launch(data.nextTest, "quiz")}>Quiz lo</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {data.tests.map((t) => (
              <Card key={t.testNo} className={t.done ? "opacity-60" : ""}>
                <CardContent className="flex flex-wrap items-center gap-2 py-3">
                  <span className="font-medium">
                    {t.done ? "✓ " : ""}#{t.testNo} {t.name}
                  </span>
                  <Badge variant="outline">{t.type}</Badge>
                  <span className="text-xs text-muted-foreground">{istTime(t.dateIso, { weekday: "short" })}</span>
                  {t.marks !== null && <span className="text-xs text-muted-foreground">· {t.marks}/720</span>}
                  {t.percentile !== null && <span className="text-xs text-muted-foreground">· {t.percentile} %ile</span>}
                  {!t.done && (
                    <span className="ml-auto flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => launch(t, "solve")}>Padhao</Button>
                      <Button variant="ghost" size="sm" onClick={() => launch(t, "quiz")}>Quiz</Button>
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

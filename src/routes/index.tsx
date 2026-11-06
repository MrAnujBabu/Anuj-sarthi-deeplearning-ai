import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Atom, AudioLines, BookOpen, CalendarDays, FlaskConical, Leaf, Repeat2, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";
import { DoubtSidebar, MobileStudyMenu } from "@/components/doubt-sidebar";
import { SnapComposer } from "@/components/snap-composer";
import { compressImage, loadThreads, pendingFirstMessage, type Thread } from "@/lib/threads";
import { threadMeta } from "@/lib/thread-groups";
import { pdfsToText } from "@/lib/pdf-text";
import { useEffect, useRef, useState } from "react";
import { ChatControls } from "@/components/chat-controls";
import { DEFAULT_MODEL, upgradedTutorPreference, type Effort } from '@/lib/models';
import { StudyProgress } from "@/components/study-progress";
import { getQuizTimer } from "@/lib/memory.functions";
import { SUBJECT_STARTERS, type SubjectId } from "@/lib/subject-starters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapSolve — Snap a NEET doubt, get the NCERT solution" },
      {
        name: "description",
        content: "Photograph any NEET 2027 MCQ, diagram or formula and get a step-by-step NCERT derivation with instant follow-up chat.",
      },
      { property: "og:title", content: "SnapSolve — NEET 2027 Snap-to-Solve" },
      { property: "og:description", content: "Snap a question, get a step-by-step NCERT solution in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SUBJECT_ICONS = { physics: Atom, chemistry: FlaskConical, biology: Leaf } as const;

const TOOLS = [
  { to: "/voice", icon: AudioLines, label: "Voice call", hint: "Teacher se bol ke poochho" },
  { to: "/youtube", icon: Youtube, label: "Video → Hindi", hint: "Koi bhi lecture saral Hindi mein" },
  { to: "/practice", icon: Repeat2, label: "Saved practice", hint: "Bina credits revision" },
  { to: "/batch", icon: CalendarDays, label: "Mera Batch", hint: "Classes, tests, notes" },
] as const;

/** Puts text in the composer the same way dictation does, so the student can edit before sending. */
function fillComposer(root: HTMLElement | null, text: string) {
  const el = root?.querySelector("textarea");
  if (!el) return;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(text.length, text.length);
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

function Index() {
  const navigate = useNavigate();
  const composerRef = useRef<HTMLDivElement>(null);
  const [quiz, setQuiz] = useState(false);
  const [search, setSearch] = useState(false);
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [recent, setRecent] = useState<Thread[]>([]);
  useEffect(() => setSearch(localStorage.getItem("snapsolve.search") === "1"), []);
  const [model,setModel] = useState<string>(DEFAULT_MODEL);
  const [effort,setEffort] = useState<Effort>('medium');
  useEffect(()=>{const prefs=upgradedTutorPreference(localStorage);setModel(prefs.model);setEffort(prefs.effort);},[]);
  useEffect(()=>{getQuizTimer().then((r)=>{if(r.defaultMode==='quiz')setQuiz(true);}).catch(()=>{});},[]);
  useEffect(() => {
    const load = () => setRecent(loadThreads().slice(0, 3));
    load();
    window.addEventListener("snapsolve:threads", load);
    return () => window.removeEventListener("snapsolve:threads", load);
  }, []);
  const active = SUBJECT_STARTERS.find((s) => s.id === subject);

  return (
    <div className="flex h-screen bg-background">
      <DoubtSidebar />
      <main className="flex min-w-0 flex-1 flex-col items-center overflow-y-auto px-5 pb-10 pt-4 md:py-6">
        <div className="w-full max-w-2xl md:pt-12">
          <div className="-ml-2 mb-5 flex min-w-0 items-center gap-2 md:hidden">
            <MobileStudyMenu />
            <img src={logo} alt="SnapSolve logo" width={36} height={36} className="size-9 shrink-0" />
            <span className="min-w-0 truncate font-display text-xl font-semibold">SnapSolve</span>
          </div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4 text-primary"/>NEET 2027 · NCERT Class 11 & 12</div>
          <h1 className="font-display text-3xl font-medium leading-tight md:text-5xl">SnapSolve, your study companion.</h1>
          <p className="mt-2 text-base text-muted-foreground md:mt-4 md:text-lg">What are we learning today?</p>

          <div className="mt-5 md:mt-8" ref={composerRef}>
            <SnapComposer
              big
              controls={<ChatControls model={model} effort={effort} onModel={v=>{setModel(v);localStorage.setItem('snapsolve.model',v);}} onEffort={v=>{setEffort(v);localStorage.setItem('snapsolve.effort',v);}} quiz={quiz} onQuiz={setQuiz} search={search} onSearch={v=>{setSearch(v);localStorage.setItem('snapsolve.search',v ? '1' : '0');}} />}
              placeholder="Ask a doubt, snap a question, or revise a chapter…"
              onSubmit={async (m) => {
                const docs = await pdfsToText(m.files);
                const files = await Promise.all(docs.files.map((f) => compressImage(f)));
                const id = crypto.randomUUID();
                pendingFirstMessage.set(id, {
                  text: docs.text + (m.text.trim() || (quiz ? "Is material se mujhse questions poochho." : "Solve this question step by step.")),
                  files,
                  mode: quiz ? "quiz" : "solve",
                });
                if (quiz) localStorage.setItem(`snapsolve.quiz.${id}`, "1");
                navigate({ to: "/doubt/$threadId", params: { threadId: id } });
              }}
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 md:mt-6 md:gap-3" role="group" aria-label="Subject starters">
            {SUBJECT_STARTERS.map((s) => {
              const Icon = SUBJECT_ICONS[s.id];
              const on = subject === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSubject(on ? null : s.id)}
                  className={cn(
                    "touch-btn flex items-start gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:px-4 md:py-3.5",
                    on && "border-primary/60 bg-accent",
                  )}
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {active && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label={`${active.label} starters`}>
              {active.starters.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => fillComposer(composerRef.current, p)}
                  className="touch-btn rounded-full border bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <StudyProgress className="mt-6 md:mt-8" />

          {recent.length > 0 && (
            <section className="mt-6 md:hidden" aria-label="Recent doubts">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Wahi se aage badho</h2>
              <div className="divide-y rounded-xl border bg-card">
                {recent.map((t) => (
                  <Link key={t.id} to="/doubt/$threadId" params={{ threadId: t.id }} className="flex items-center gap-3 px-3 py-2.5 active:bg-accent">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{threadMeta(t)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <nav className="mt-6 grid grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-3" aria-label="Study tools">
            {TOOLS.map(({ to, icon: Icon, label, hint }) => (
              <Link key={to} to={to} className="touch-btn group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/40">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4" /></span>
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{hint}</span>
                </span>
              </Link>
            ))}
          </nav>
          <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">Saved in this browser · Backup, Restore aur media clear karna Settings → Study data mein hai.</p>
        </div>
      </main>
    </div>
  );
}

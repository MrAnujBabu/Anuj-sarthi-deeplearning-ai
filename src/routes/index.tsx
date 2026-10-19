import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Atom, FlaskConical, Leaf, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { DoubtSidebar, MobileStudyMenu } from "@/components/doubt-sidebar";
import { SnapComposer } from "@/components/snap-composer";
import { compressImage, pendingFirstMessage } from "@/lib/threads";
import { pdfsToText } from "@/lib/pdf-text";
import { useEffect, useState } from "react";
import { ChatControls } from "@/components/chat-controls";
import { BackupControls } from '@/components/backup-controls';
import { Button } from '@/components/ui/button';
import { DEFAULT_MODEL, resolveModel, resolveEffort, type Effort } from '@/lib/models';
import { RevisionCard } from "@/components/revision-card";
import { getQuizTimer } from "@/lib/memory.functions";

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

const SUBJECTS = [
  { icon: Atom, label: "Physics", hint: "Numericals, ray diagrams, circuits" },
  { icon: FlaskConical, label: "Chemistry", hint: "Mechanisms, structures, stoichiometry" },
  { icon: Leaf, label: "Biology", hint: "Diagrams, cycles, NCERT lines" },
];

function Index() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => setSearch(localStorage.getItem("snapsolve.search") === "1"), []);
  const [model,setModel] = useState<string>(DEFAULT_MODEL);
  const [effort,setEffort] = useState<Effort>('medium');
  useEffect(()=>{const m=localStorage.getItem('snapsolve.model');if(resolveModel(m))setModel(m ?? DEFAULT_MODEL);setEffort(resolveEffort(localStorage.getItem('snapsolve.effort')));},[]);
  useEffect(()=>{getQuizTimer().then((r)=>{if(r.defaultMode==='quiz')setQuiz(true);}).catch(()=>{});},[]);
  return (
    <div className="flex h-screen bg-background">
      <DoubtSidebar />
      <main className="flex min-w-0 flex-1 flex-col items-center overflow-y-auto px-5 py-6">
        <div className="w-full max-w-2xl pt-2 md:pt-16">
          <div className="mb-5 flex min-w-0 items-center gap-3 md:hidden">
            <img src={logo} alt="SnapSolve logo" width={40} height={40} className="size-10 shrink-0" />
            <span className="min-w-0 truncate font-display text-2xl font-semibold">SnapSolve</span>
          </div>
          <div className="-mx-5 mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border-b bg-background px-5 py-2.5 sm:flex md:mb-12">
            <MobileStudyMenu/>
            <Button variant="secondary" size="sm" className="rounded-full">Chat</Button>
            <Button variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex" disabled title="Background connection required">Cowork · unavailable</Button>
            <Button variant="ghost" size="sm" asChild className="ml-auto shrink-0 rounded-full"><Link to="/practice">Saved practice</Link></Button>
          </div>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-5 text-primary"/>NEET 2027 · NCERT Class 11 & 12</div>
          <h1 className="font-display text-3xl font-medium leading-tight md:text-5xl">SnapSolve, your study companion.</h1>
          <p className="mt-2 text-base text-muted-foreground md:mt-4 md:text-lg">What are we learning today?</p>

          <div className="mt-5 md:mt-8">
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

          <RevisionCard />

          <div className="mt-6 grid gap-2 sm:grid-cols-3 md:mt-10 md:gap-3">
            {SUBJECTS.map(({ icon: Icon, label, hint }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/40 md:px-4 md:py-3.5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4"><p className="text-xs text-muted-foreground">Saved in this browser</p><BackupControls/></div>
        </div>
      </main>
    </div>
  );
}

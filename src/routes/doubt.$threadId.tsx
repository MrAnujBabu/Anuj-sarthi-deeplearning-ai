import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, FileDown, FileText, PanelBottomOpen, Pause, Play, ScanText } from "lucide-react";
import { RESUME_TEXT, isConnectionError, isResumeText, pausedKey } from "@/lib/chat-resume";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { DoubtSidebar, MobileStudyMenu } from "@/components/doubt-sidebar";
import { SnapComposer } from "@/components/snap-composer";
import { compressImage, getThread, pendingFirstMessage, titleFrom, upsertThread } from "@/lib/threads";
import { AssistantAnswer } from "@/components/assistant-answer";
import { AnswerFooter } from "@/components/answer-footer";
import { answerTextFor, councilInputFor, isWorthChecking } from "@/lib/council-input";
import { COUNCIL_MODELS, PHOTO_OPEN, splitPhotoReading, wrapPhotoReading } from "@/lib/verify";
import { ToolStep } from "@/components/tool-step";
import { ChatControls } from "@/components/chat-controls";
import { restoreDocs, stripDocs } from "@/lib/doc-store";
import { parseCards, parseQuizTag, recordResults } from "@/lib/srs";
import { DEFAULT_MODEL, upgradedTutorPreference, type Effort } from '@/lib/models';
import { displayAiError, isCreditError, isConfigurationError } from '@/lib/ai/errors';
import { Button } from '@/components/ui/button';
import { QuizActions } from "@/components/quiz-actions";
import { exportThreadMarkdown } from "@/lib/export-chat";
import { extractQuizOptions } from "@/lib/quiz-options";
import { emphasizeQuizQuestion } from "@/lib/quiz-emphasis";
import { DOC_RE, pdfsToText } from "@/lib/pdf-text";
import { readDeviceFlag, useAutoVerify, useBoldQuestions, useHideChatWidget, useHideTopBar, useStudyTextSize } from '@/lib/quiz-label-preference';

export const Route = createFileRoute("/doubt/$threadId")({
  head: () => ({
    meta: [
      { title: "Doubt — SnapSolve NEET 2027" },
      { name: "description", content: "Step-by-step NCERT solution and follow-up chat for your NEET doubt." },
      { property: "og:title", content: "Doubt — SnapSolve" },
      { property: "og:description", content: "Step-by-step NCERT solution with follow-up chat." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DoubtPage,
});

function DoubtPage() {
  const { threadId } = Route.useParams();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let live = true;
    setInitial(null);
    void restoreDocs(getThread(threadId)?.messages ?? []).then((m) => live && setInitial(m));
    return () => {
      live = false;
    };
  }, [threadId]);
  const [topBarSetting] = useHideTopBar();
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!topBarSetting) return;
    let startY = -1, startX = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const start = (e: TouchEvent) => { const t = e.touches[0]; if (!t) return; startY = t.clientY <= 48 ? t.clientY : -1; startX = t.clientX; };
    const move = (e: TouchEvent) => {
      if (startY < 0) return;
      const t = e.touches[0]; if (!t) return;
      if (t.clientY - startY > 50 && Math.abs(t.clientX - startX) < 60) {
        startY = -1; setPeek(true); clearTimeout(timer); timer = setTimeout(() => setPeek(false), 4000);
      }
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move); clearTimeout(timer); };
  }, [topBarSetting]);
  const topBarHidden = topBarSetting && !peek;

  return (
    <div className="flex h-screen bg-background">
      <DoubtSidebar activeId={threadId} />
      <main className="flex min-w-0 flex-1 flex-col">
        {topBarHidden ? <div className="fixed left-2 top-2 z-30 rounded-md bg-background/80 backdrop-blur md:hidden"><MobileStudyMenu activeId={threadId}/></div> :
        <header className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <MobileStudyMenu activeId={threadId}/>
          <Link to="/" aria-label="Back" className="p-1">
            <ArrowLeft className="size-5" />
          </Link>
          <img src={logo} alt="" width={28} height={28} className="size-7" />
          <span className="font-display text-lg font-semibold">SnapSolve</span>
        </header>}
        {initial && <ChatWindow key={threadId} threadId={threadId} initialMessages={initial} />}
      </main>
    </div>
  );
}

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [effort, setEffort] = useState<Effort>('medium');
  const [settingsReady, setSettingsReady] = useState(false);
  useEffect(() => { const prefs=upgradedTutorPreference(localStorage); setModel(prefs.model); setEffort(prefs.effort); setSettingsReady(true); }, []);
  const quizKey = `snapsolve.quiz.${threadId}`;
  const [quiz, setQuiz] = useState(false);
  const [chatHidden, setChatHidden] = useHideChatWidget();
  const [boldQuestions] = useBoldQuestions();
  const [textSize] = useStudyTextSize();
  useEffect(() => setQuiz(localStorage.getItem(quizKey) === "1" || pendingFirstMessage.get(threadId)?.mode === "quiz"), [quizKey, threadId]);
  const [search, setSearch] = useState(false);
  useEffect(() => setSearch(localStorage.getItem("snapsolve.search") === "1"), []);
  const toggleSearch = (on: boolean) => {
    setSearch(on);
    localStorage.setItem("snapsolve.search", on ? "1" : "0");
  };
  const { messages, sendMessage: rawSend, status, stop, error } = useChat({
    id: threadId,
    experimental_throttle: 50,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(displayAiError(e.message) || "Couldn't reach the tutor. Check your connection and try again."),
  });
  const [autoVerify] = useAutoVerify();
  // Photo reading: Gemini transcribes doubt photos first; the tutor gets the text plus the image.
  const [reading, setReading] = useState(false);
  const readCtrl = useRef<AbortController | null>(null);
  const sendMessage = async (m: Parameters<typeof rawSend>[0], mode: "quiz" | "solve" = quiz ? "quiz" : "solve") => {
    let msg = m;
    const files = m && "files" in m && Array.isArray(m.files) ? m.files : [];
    const photos = files.filter((f) => f.mediaType?.startsWith("image/") && f.url.startsWith("data:image/"));
    const text = m && "text" in m && typeof m.text === "string" ? m.text : null;
    if (mode === "solve" && photos.length && text !== null && !text.includes(PHOTO_OPEN) && readDeviceFlag("snapsolve.photo-reading", true)) {
      const ctrl = new AbortController();
      readCtrl.current = ctrl;
      setReading(true);
      try {
        const res = await fetch("/api/vision-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: photos.slice(0, 4).map((f) => f.url) }),
          signal: ctrl.signal,
        });
        const j = (await res.json().catch(() => ({}))) as { text?: string };
        if (res.ok && j.text) msg = { ...m, text: wrapPhotoReading(j.text) + text } as typeof m;
        else if (res.status === 402) toast.message("Photo reading paused (AI credits) — the tutor will read the photo directly.");
      } catch {
        /* Skipped or offline: the tutor still reads the photo itself. */
      } finally {
        if (readCtrl.current === ctrl) readCtrl.current = null;
        setReading(false);
      }
    }
    return rawSend(msg, { body: { mode, model, effort, search } });
  };
  const toggleQuiz = (on: boolean) => {
    setQuiz(on);
    localStorage.setItem(quizKey, on ? "1" : "0");
    if (on && !busy) sendMessage({ text: "Quiz mode ON — is topic par mujhse NEET practice questions poochho." }, "quiz");
  };
  useEffect(() => {
    const pending = pendingFirstMessage.get(threadId);
    if (!settingsReady || !pending || initialMessages.length > 0) return;
    // Deferred so a dev double-mount cancels the first attempt instead of sending twice.
    const t = setTimeout(() => {
      pendingFirstMessage.delete(threadId);
      sendMessage({ text: pending.text, files: pending.files }, pending.mode ?? "solve");
    }, 0);
    return () => clearTimeout(t);
  }, [threadId, initialMessages.length, sendMessage, settingsReady]);

  // Save to this browser whenever the conversation settles.
  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "submitted" || status === "streaming") {
      if (messages.length !== 1) return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const stored = await stripDocs(messages);
        if (cancelled) return;
        const ok = upsertThread({ id: threadId, title: titleFrom(messages), updatedAt: Date.now(), messages: stored });
        if (!ok) throw new Error('Browser storage is full — this doubt could not be saved.');
        if (status === "ready") {
          for (const m of messages)
            if (m.role === "assistant")
              recordResults(m.id, parseCards(m.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n")));
        }
      } catch {
        if (!cancelled) toast.error('Study data could not be saved. Keep this page open and download a backup before retrying.');
      }
    })();
    return () => { cancelled = true; };
  }, [messages, status, threadId]);

  const busy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  // Auto-verify only answers that finish streaming in this session (never old history, never paused partials).
  const [autoTarget, setAutoTarget] = useState<string | null>(null);
  const prevStatus = useRef(status);

  // Pause / resume: pausing stops the stream but keeps the partial answer; resuming asks the tutor to continue from the last word.
  const [paused, setPaused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => { setPaused(localStorage.getItem(pausedKey(threadId)) === "1"); }, [threadId]);
  const markPaused = (on: boolean) => { setPaused(on); if (on) localStorage.setItem(pausedKey(threadId), "1"); else localStorage.removeItem(pausedKey(threadId)); };
  const pause = () => { if (!busy) return; stop(); markPaused(true); };
  const resume = () => {
    if (busy) return;
    markPaused(false);
    setInterrupted(false);
    void sendMessage({ text: RESUME_TEXT });
  };
  useEffect(() => { if (error && !busy && isConnectionError(error.message)) { setInterrupted(true); markPaused(true); } }, [error, busy]);
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if ((was === "streaming" || was === "submitted") && status === "ready" && !paused) {
      const l = messages[messages.length - 1];
      if (l?.role === "assistant") setAutoTarget(l.id);
    }
  }, [status, messages, paused]);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  // Connection came back after a drop → continue automatically where it left off.
  useEffect(() => {
    if (!online || !interrupted || busy) return;
    const t = setTimeout(() => { toast.success("Connection back — continuing the answer."); resume(); }, 1200);
    return () => clearTimeout(t);
  }, [online, interrupted, busy]);
  const quizSource = last?.role === "assistant" ? last : undefined;
  const openQuizText = quizSource?.parts.map((p) => p.type === "text" ? p.text : "").join("\n") ?? "";
  const openQuizOptions = quiz ? parseQuizTag(openQuizText) : null;
  const openQuiz = openQuizOptions ? extractQuizOptions(openQuizText, openQuizOptions) : null;
  const submittedAnswer = busy ? [...messages].reverse().find(m => m.role === "user")?.parts.find(p => p.type === "text") : undefined;
  const selectedAnswer = submittedAnswer?.type === "text" && /^[A-D]$/.test(submittedAnswer.text.trim()) ? submittedAnswer.text.trim() : undefined;
  const waiting = busy && (last?.role === "user" || !last?.parts.some((p) => p.type === "text" && p.text));

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className={`study-text study-text-${textSize} mx-auto w-full max-w-3xl`}>
          {messages.length === 0 && !busy && (
            <div className="py-20 text-center text-muted-foreground">
              This doubt is empty. Snap a question below to get started.
            </div>
          )}
          {messages.map((m, idx) => (
            <Message key={m.id} from={m.role} className="msg-in">
              <MessageContent
                className={
                  m.role === "user"
                    ? "group-[.is-user]:bg-transparent group-[.is-user]:p-0"
                    : "bg-transparent"
                }
              >
                {m.parts.map((p, i) => {
                  if (p.type === "file" && p.mediaType === "application/pdf")
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2 text-sm">
                        <FileText className="size-4" /> {p.filename ?? "PDF document"}
                      </div>
                    );
                  if (p.type === "file" && p.mediaType?.startsWith("image/"))
                    return (
                      <img key={i} src={p.url} alt="Snapped question" className="max-h-72 rounded-lg border object-contain" />
                    );
                  if (p.type === "text")
                    return m.role === "assistant" ? (
                      <AssistantAnswer
                        key={i}
                        text={openQuiz && m.id === quizSource?.id && m.parts.filter(part => part.type === "text").length === 1 ? emphasizeQuizQuestion(openQuiz.text) : p.text}
                        isAnimating={busy && m.id === last?.id}
                        compact={quiz}
                        boldQuestion={boldQuestions && m.id === quizSource?.id}
                      />

                    ) : (
                      isResumeText(p.text) ? (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground"><Play className="size-3" />Resumed</span>
                      ) : (
                      <UserText key={i} text={p.text} />
                      )
                    );
                  if (p.type.startsWith("tool-")) return <ToolStep key={i} part={p as never} />;
                  return null;
                })}
              </MessageContent>
              {m.role === "assistant" && !busy && (() => {
                const answer = answerTextFor(messages, idx);
                const input = councilInputFor(messages, idx);
                return (
                  <AnswerFooter
                    messageId={m.id}
                    text={answer}
                    question={input.question}
                    images={input.images}
                    canVerify={!quiz && !!input.question && !!answer}
                    autoStart={autoVerify && autoTarget === m.id && isWorthChecking(answer)}
                    onAskTutor={(t) => { void sendMessage({ text: t }, "solve"); }}
                  />
                );
              })()}
            </Message>
          ))}
          {!quiz && !busy && last?.role === "assistant" && (
            <div className="msg-in flex flex-wrap gap-2 pl-1" aria-label="Quick follow-ups">
              {["Explain simpler", "Give me a similar MCQ", "NCERT line kahan hai?", "Common trap kya hai?"].map((q) => (
                <button key={q} type="button" onClick={() => sendMessage({ text: q })} className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {q}
                </button>
              ))}
            </div>
          )}
          {openQuizOptions && openQuiz && quizSource && <QuizActions questionKey={quizSource.id} options={openQuizOptions} labels={openQuiz.labels} selectedAnswer={selectedAnswer} disabled={busy} chatHidden={chatHidden} onChatHidden={setChatHidden} onSend={(t) => { if (t === 'stop quiz') setChatHidden(false); sendMessage({ text: t }, "quiz"); }} />}
          {reading && (
            <div className="msg-in flex items-center gap-3 px-1" role="status">
              <ScanText className="size-4 shrink-0 text-primary" aria-hidden />
              <Shimmer>{`${COUNCIL_MODELS.gemini.name} is reading your photo…`}</Shimmer>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => readCtrl.current?.abort()}>Skip</Button>
            </div>
          )}
          {waiting && (
            <div className="msg-in flex items-center gap-3 px-1" role="status">
              <span className="flex gap-1" aria-hidden>{[0,1,2].map(i => <span key={i} className="think-dot size-1.5 rounded-full bg-primary" />)}</span>
              <Shimmer>Reading your question and working it out…</Shimmer>
            </div>
          )}
          {error && !busy && !interrupted && (
            <div role="alert" className="space-y-3 border-l-2 border-destructive pl-4 text-sm">
              <p className="text-destructive">{displayAiError(error.message)}</p>
              {isCreditError(error.message) && <p>AI is paused. Your saved questions, answers and revision cards are still available.</p>}
              {isConfigurationError(error.message) && <p>This is a model or workspace setup issue, not a credit-balance error. The workspace owner needs to verify Claude access. Saved practice is still available.</p>}
              <Button variant="outline" asChild><Link to="/practice">{isCreditError(error.message) ? 'Practice saved material · no AI credits' : 'Practice saved material'}</Link></Button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {quiz && chatHidden && <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-end gap-2 border-t px-4 py-1"><Button variant="ghost" size="sm" onClick={() => setChatHidden(false)}><PanelBottomOpen className="size-4" />Show Chat Widget</Button>{busy ? <Button variant="outline" size="sm" onClick={pause}><Pause className="size-4" />Pause</Button> : paused && <Button size="sm" onClick={resume}><Play className="size-4" />Resume</Button>}</div>}
      {(busy || paused) && !(quiz && chatHidden) && (
        <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3 px-4 pt-2" role="status">
          <span className={`size-2 shrink-0 rounded-full ${busy ? "animate-pulse bg-primary" : interrupted && !online ? "bg-destructive" : "bg-muted-foreground"}`} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {busy ? "Tutor is working…" : interrupted ? (online ? "Connection dropped — resuming…" : "Offline — will continue automatically when you're back online") : "Paused — answer saved so far"}
          </span>
          {busy ? (
            <Button type="button" variant="outline" className="touch-btn h-10 shrink-0 rounded-full px-4" onClick={pause}><Pause className="size-4" />Pause</Button>
          ) : (
            <Button type="button" className="touch-btn h-10 shrink-0 rounded-full px-4" onClick={resume} disabled={!online}><Play className="size-4" />Resume</Button>
          )}
        </div>
      )}
      <div hidden={quiz && chatHidden} className="mx-auto w-full max-w-3xl border-t bg-background/85 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:pb-4 md:pt-3">
        <SnapComposer
          controls={<ChatControls model={model} effort={effort} onModel={v=>{setModel(v);localStorage.setItem('snapsolve.model',v);}} onEffort={v=>{setEffort(v);localStorage.setItem('snapsolve.effort',v);}} quiz={quiz} onQuiz={toggleQuiz} search={search} onSearch={toggleSearch} disabled={busy} />}
          actions={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Export chat as markdown"
            title="Export chat as Obsidian markdown"
            onClick={() => {
              const t = getThread(threadId);
              if (!t || t.messages.length === 0) {
                toast.error("Nothing to export yet.");
                return;
              }
              exportThreadMarkdown(t);
              toast.success("Saved as an Obsidian-ready .md note.");
            }}
          >
            <FileDown className="size-4" />
          </Button>
          }
          status={reading ? "submitted" : status}
          onStop={() => { if (reading) readCtrl.current?.abort(); else pause(); }}
          placeholder={
            quiz && search
              ? "Type your answer — quiz + live search both on…"
              : quiz
                ? "Type your answer — A, B, C or D (or 'hint', 'skip', 'stop quiz')…"
                : search
                  ? "Ask anything — Search is on, I'll fetch live web data…"
                  : "Ask a follow-up — 'why is option C wrong?', 'explain step 3'…"
          }

          onSubmit={async (msg) => {
            if (busy || reading) return;
            markPaused(false); setInterrupted(false);
            const docs = await pdfsToText(msg.files);
            const files = await Promise.all(docs.files.map((f) => compressImage(f)));
            await sendMessage({ text: docs.text + (msg.text.trim() || "Solve this question step by step."), files });
          }}
        />
      </div>
    </>
  );
}

/** Student turn: PDF chips, Gemini's folded photo reading, then the question bubble. */
function UserText({ text }: { text: string }) {
  const { reading, rest } = splitPhotoReading(text);
  return (
    <div className="space-y-2">
      {[...rest.matchAll(DOC_RE)].map((d, j) => (
        <div key={j} className="flex w-fit items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"><FileText className="size-4" /> {d[1]}</div>
      ))}
      {reading && (
        <details className="group w-fit max-w-full rounded-lg border bg-card px-3 py-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground"><ScanText className="size-3.5 text-primary" />Photo read by {COUNCIL_MODELS.gemini.name}</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{reading}</p>
        </details>
      )}
      <p className="study-question w-fit max-w-full whitespace-pre-wrap rounded-2xl rounded-br-md border border-primary/20 bg-user-bubble px-4 py-2.5 text-foreground shadow-sm">{rest.replace(DOC_RE, "")}</p>
    </div>
  );
}

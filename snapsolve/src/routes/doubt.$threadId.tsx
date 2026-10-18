import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, FileDown, FileText, Globe } from "lucide-react";
import { useEffect, useState } from "react";
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
import { MessageActions } from "@/components/message-actions";
import { ToolStep } from "@/components/tool-step";
import { Switch } from "@/components/ui/switch";
import { restoreDocs, stripDocs } from "@/lib/doc-store";
import { parseCards, parseQuizTag, recordResults } from "@/lib/srs";
import { ModelPicker } from '@/components/model-picker';
import { DEFAULT_MODEL, resolveModel, resolveEffort, type Effort } from '@/lib/models';
import { displayAiError, isCreditError } from '@/lib/ai/errors';
import { Button } from '@/components/ui/button';
import { QuizActions } from "@/components/quiz-actions";
import { exportThreadMarkdown } from "@/lib/export-chat";

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

  return (
    <div className="flex h-screen bg-background">
      <DoubtSidebar activeId={threadId} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <MobileStudyMenu activeId={threadId}/>
          <Link to="/" aria-label="Back" className="p-1">
            <ArrowLeft className="size-5" />
          </Link>
          <img src={logo} alt="" width={28} height={28} className="size-7" />
          <span className="font-display text-lg font-semibold">SnapSolve</span>
        </header>
        {initial && <ChatWindow key={threadId} threadId={threadId} initialMessages={initial} />}
      </main>
    </div>
  );
}

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [effort, setEffort] = useState<Effort>('medium');
  useEffect(() => { const id=localStorage.getItem('snapsolve.model'); if(resolveModel(id)) setModel(id ?? DEFAULT_MODEL); setEffort(resolveEffort(localStorage.getItem('snapsolve.effort'))); }, []);
  const quizKey = `snapsolve.quiz.${threadId}`;
  const [quiz, setQuiz] = useState(false);
  useEffect(() => setQuiz(localStorage.getItem(quizKey) === "1" || pendingFirstMessage.get(threadId)?.mode === "quiz"), [quizKey, threadId]);
  const [search, setSearch] = useState(false);
  useEffect(() => setSearch(localStorage.getItem("snapsolve.search") === "1"), []);
  const toggleSearch = (on: boolean) => {
    setSearch(on);
    localStorage.setItem("snapsolve.search", on ? "1" : "0");
  };
  const { messages, sendMessage: rawSend, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(displayAiError(e.message) || "Couldn't reach the tutor. Check your connection and try again."),
  });
  const sendMessage = (m: Parameters<typeof rawSend>[0], mode: "quiz" | "solve" = quiz ? "quiz" : "solve") =>
    rawSend(m, { body: { mode, model, effort, search } });
  const toggleQuiz = (on: boolean) => {
    setQuiz(on);
    localStorage.setItem(quizKey, on ? "1" : "0");
    if (on && !busy) sendMessage({ text: "Quiz mode ON — is topic par mujhse NEET practice questions poochho." }, "quiz");
  };
  useEffect(() => {
    const pending = pendingFirstMessage.get(threadId);
    if (!pending || initialMessages.length > 0) return;
    // Deferred so a dev double-mount cancels the first attempt instead of sending twice.
    const t = setTimeout(() => {
      pendingFirstMessage.delete(threadId);
      sendMessage({ text: pending.text, files: pending.files }, pending.mode ?? "solve");
    }, 0);
    return () => clearTimeout(t);
  }, [threadId, initialMessages.length, sendMessage]);

  // Save to this browser whenever the conversation settles.
  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "submitted" || status === "streaming") {
      if (messages.length !== 1) return;
    }
    const ok = upsertThread({ id: threadId, title: titleFrom(messages), updatedAt: Date.now(), messages: stripDocs(messages) });
    if (status === "ready") {
      for (const m of messages)
        if (m.role === "assistant")
          recordResults(m.id, parseCards(m.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n")));
    }
    if (!ok) toast.error("Browser storage is full — this doubt couldn't be saved.");
  }, [messages, status, threadId]);

  const busy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  const waiting = busy && (last?.role === "user" || !last?.parts.some((p) => p.type === "text" && p.text));

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && !busy && (
            <div className="py-20 text-center text-muted-foreground">
              This doubt is empty. Snap a question below to get started.
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent
                className={
                  m.role === "user"
                    ? "group-[.is-user]:bg-secondary group-[.is-user]:text-secondary-foreground"
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
                        text={p.text}
                        isAnimating={busy && m.id === last?.id}
                      />
                    ) : (
                      <p key={i} className="w-fit max-w-full whitespace-pre-wrap rounded-2xl border bg-card px-4 py-2.5 shadow-sm">{p.text}</p>
                    );
                  if (p.type.startsWith("tool-")) return <ToolStep key={i} part={p as never} />;
                  return null;
                })}
              </MessageContent>
              {m.role === "assistant" && !busy && (
                <MessageActions
                  messageId={m.id}
                  text={m.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n")}
                />
              )}
            </Message>
          ))}
          {quiz && !busy && last?.role === "assistant" && (() => {
            const opts = parseQuizTag(last.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n"));
            return opts ? <QuizActions questionKey={last.id} options={opts} onSend={(t) => sendMessage({ text: t }, "quiz")} /> : null;
          })()}
          {waiting && (
            <div className="px-1">
              <Shimmer>Reading your question and working it out…</Shimmer>
            </div>
          )}
          {error && !busy && (
            <div role="alert" className="space-y-3 border-l-2 border-destructive pl-4 text-sm">
              <p className="text-destructive">{displayAiError(error.message)}</p>
              {isCreditError(error.message) && <p>AI is paused. Your saved questions, answers and revision cards are still available.</p>}
              <Button variant="outline" asChild><Link to="/practice">Practice saved material · no AI credits</Link></Button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl border-t bg-background/85 px-4 pb-2 pt-2 backdrop-blur md:pb-4 md:pt-3">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 md:mb-2"><ModelPicker model={model} effort={effort} onModel={v=>{setModel(v);localStorage.setItem('snapsolve.model',v);}} onEffort={v=>{setEffort(v);localStorage.setItem('snapsolve.effort',v);}} disabled={busy}/></div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <Switch checked={quiz} onCheckedChange={toggleQuiz} disabled={busy} aria-label="Quiz mode" />
            <span className="font-medium">Quiz mode</span>
            <span className="text-xs text-muted-foreground">{quiz ? "Practice questions, one at a time" : "Off"}</span>
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <Switch checked={search} onCheckedChange={toggleSearch} disabled={busy || quiz} aria-label="Web search" />
            <Globe className={`size-3.5 ${search ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium">Search</span>
            <span className="text-xs text-muted-foreground">{search ? "Live web data" : "Off"}</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5 rounded-full"
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
            <FileDown className="size-3.5" /> Export .md
          </Button>
        </div>
        <SnapComposer
          status={status}
          onStop={stop}
          placeholder={
            quiz
              ? "Type your answer — A, B, C or D (or 'hint', 'skip', 'stop quiz')…"
              : search
                ? "Ask anything — Search is on, I'll fetch live web data…"
                : "Ask a follow-up — 'why is option C wrong?', 'explain step 3'…"
          }
          onSubmit={async (msg) => {
            if (busy) return;
            const files = await Promise.all(msg.files.map((f) => compressImage(f)));
            sendMessage({ text: msg.text.trim() || "Solve this question step by step.", files });
          }}
        />
      </div>
    </>
  );
}

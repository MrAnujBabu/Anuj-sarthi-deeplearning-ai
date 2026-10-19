import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, GraduationCap, Globe, Mic, MicOff, Paperclip, PhoneOff, Phone, Upload, Volume2, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { useVoiceChoice, useStudyTextSize, STUDY_TEXT_SIZES, VOICE_CHOICES, type VoiceChoiceId, type StudyTextSize } from "@/lib/quiz-label-preference";
import { extractLocally } from "@/lib/file-extract";
import { cn } from "@/lib/utils";
import { parseVoiceTranscript, voiceTranscriptMarkdown, type VoiceRow } from "@/lib/voice-transcript";
import { QuizActions } from "@/components/quiz-actions";
import { VOICE_ANSWERS, VOICE_SKIP, validVoiceAnswer } from "@/lib/voice-quiz";
import { readVoicePdf } from '@/lib/voice-pdf';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { resolveModel, VOICE_TUTOR_MODEL } from '@/lib/models';
import { billableSeconds, confirmedSeconds } from '@/lib/voice-usage';

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice mode — SnapSolve" },
      { name: "description", content: "Talk to your NEET tutor hands-free: speak your doubt and hear the answer." },
      { property: "og:title", content: "Voice mode — SnapSolve" },
      { property: "og:description", content: "Voice-to-voice NEET doubt solving, no typing needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoicePage,
});

type Row = VoiceRow;
type Attachment = { name: string; text: string; pages: number; method: string };
const CONTEXT_LIMIT = 38_000;

async function readAttachment(file: File, ocr: boolean, progress: (message: string) => void): Promise<Omit<Attachment, 'name'>> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return readVoicePdf(file, ocr, progress);
  }
  return { text: (await extractLocally(file))?.trim() ?? '', pages: 0, method: 'text' };
}

function VoicePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thinking, setThinking] = useState(false);
  // Never leave quiz buttons locked if a reply is slow or lost.
  useEffect(() => {
    if (!thinking) return;
    const t = setTimeout(() => setThinking(false), 45_000);
    return () => clearTimeout(t);
  }, [thinking]);
  const [question, setQuestion] = useState<{ id: string; labels: Record<string, string> } | null>(null);
  const [picked, setPicked] = useState<string>();
  const [quiz, setQuiz] = useState(false);
  const [search, setSearch] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reading, setReading] = useState(false);
  const [ocr, setOcr] = useState(false);
  const [readProgress, setReadProgress] = useState('');
  const [usage, setUsage] = useState<number | null>(null);
  const [created, setCreated] = useState(false);
  const [finalUsage, setFinalUsage] = useState(false);
  const [callId, setCallId] = useState('');
  const [choice, setChoice] = useVoiceChoice();
  const [textSize, setTextSize] = useStudyTextSize();
  const scrollRef = useRef<HTMLElement>(null);
  const pinned = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type === 'app.call.record') {
      setCallId(typeof event['callId'] === 'string' ? event['callId'] : '');
      setCreated(false); setUsage(null); setFinalUsage(false);
    }
    if (event.type === 'gateway.session.created') setCreated(true);
    if (event.type === 'session.usage.updated' || event.type === 'session.closed') {
      const seconds = confirmedSeconds(event.usage?.seconds);
      if (seconds !== null) { setUsage(seconds); setFinalUsage(event.type === 'session.closed'); }
    }
    if (event.type === 'app.history.error') toast.error(event.error?.message ?? 'Call history save failed.');
    if (event.type === "app.quiz.question" && typeof event.questionId === "string" && event.labels && typeof event.labels === "object") {
      setQuestion({ id: event.questionId, labels: event.labels as Record<string, string> });
      setPicked(undefined);
    } else if (event.type === "app.quiz.accepted" && event.answer === VOICE_SKIP) {
      setPicked(VOICE_SKIP);
      setRows((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: "Skipped (time up)" }]);
    } else if (event.type === "app.quiz.accepted" && validVoiceAnswer(event.answer)) {
      setPicked(event.answer);
      setRows((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: `Answer ${event.answer}` }]);
    } else if (event.type === "app.quiz.rejected") {
      setThinking(false);
      toast.error(event.error?.message ?? "Answer could not be accepted.");
    } else if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
      const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
      const delta = typeof event["delta"] === "string" ? event["delta"] : "";
      if (!delta) return;
      if (role === "assistant") setThinking(false);
      setRows((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role) return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
        return [...prev, { id: crypto.randomUUID(), role, text: delta }];
      });
    } else if (event.type === "app.delegation.pending") {
      setThinking(true);
    } else if (event.type === "app.delegation.error" || event.type === "app.closed") {
      setThinking(false);
    }
  }, []);

  const prefs = useCallback(() => {
    const c = VOICE_CHOICES.find((v) => v.id === choice) ?? VOICE_CHOICES[0];
    const previous = rows.length ? `Previous conversation:\n${rows.map((r) => `${r.role === "user" ? "Student" : "Tutor"}: ${r.text}`).join("\n")}\n\n` : "";
    const docs = files.map((f) => `<doc name=${JSON.stringify(f.name)}>\n${f.text}\n</doc>`).join("\n\n");
    return { voice: c.voice, accent: c.accent, quiz, search, context: previous.slice(-Math.max(0, CONTEXT_LIMIT - docs.length)) + docs, documents: files.map(({ name, pages, method, text }) => ({ name, pages, method, chars: text.length })) };
  }, [choice, quiz, search, files, rows]);

  const voice = useLiveVoice({ onEvent, prefs });
  const canStart = voice.status === "idle" || voice.status === "closed";
  const live = voice.status === "connected";
  const locked = !canStart;

  // Follow the newest caption unless the student scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [rows, thinking]);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setReading(true);
    let contextChars = files.reduce((sum, f) => sum + f.text.length + f.name.length + 32, 0);
    try {
      for (const file of Array.from(list).slice(0, Math.max(0, 4 - files.length))) {
        if (file.size > 15 * 1024 * 1024) { toast.error(`${file.name} is over 15 MB.`); continue; }
        const result = await readAttachment(file, ocr, setReadProgress);
        const text = result.text;
        if (!text) { toast.error(`${file.name}: koi readable text nahi mila.`); continue; }
        const total = contextChars + text.length + file.name.length + 32;
        if (total > CONTEXT_LIMIT) throw new Error('Study material is too long for one call. Attach a smaller chapter; no pages were silently skipped.');
        contextChars = total;
        setFiles((prev) => [...prev, { ...result, name: file.name.replace(/"/g, "'"), text }]);
        toast.success(`${file.name} attached — tutor next call me padh lega.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'File reading failed.');
    } finally {
      setReading(false);
      setReadProgress('');
    }
  };

  const exportCall = () => {
    if (!rows.length) { toast.error("Abhi koi baat-cheet nahi hai."); return; }
    const blob = new Blob([voiceTranscriptMarkdown(rows)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `snapsolve-voice-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCall = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = parseVoiceTranscript(await file.text());
      if (!imported.length) throw new Error();
      setRows(imported);
      toast.success(`${imported.length} messages import hue — Start dabao, tutor wahi se aage badhega.`);
    } catch {
      toast.error("Ye file SnapSolve voice export nahi lagti.");
    }
  };

  const status = voice.status === "connecting" ? "Connecting…" : live ? (thinking ? "Soch raha hai…" : voice.muted ? "Muted" : "Live · bolo") : voice.status === "stopping" ? "Ending…" : "Ready";

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 pt-2 sm:px-6">
      <header className="flex shrink-0 items-center gap-2 border-b pb-2">
        <Link to="/" aria-label="Back" className="grid size-9 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1"><h1 className="text-base font-semibold">Voice mode</h1><p className="text-xs text-muted-foreground">Claude {resolveModel(VOICE_TUTOR_MODEL)?.name}</p></div>
        <span role="status" className={cn("flex shrink-0 items-center gap-1.5 text-xs", live ? "text-primary" : "text-muted-foreground")}>
          {live && <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />}
          {status}
        </span>
        <Sheet>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Voice settings and search" title="Voice settings and search">{search ? <Globe className="size-4 text-primary" /> : <SlidersHorizontal className="size-4" />}</Button></SheetTrigger>
          <SheetContent side="right" className="w-[min(90vw,340px)] overflow-y-auto"><SheetTitle>Voice settings</SheetTitle><SheetDescription>Claude {resolveModel(VOICE_TUTOR_MODEL)?.name}</SheetDescription>
      <div className="mt-6 flex flex-col items-stretch gap-5 text-sm">
        <label className="flex items-center justify-between gap-2"><GraduationCap className="size-4 text-muted-foreground" />Quiz<Switch checked={quiz} disabled={locked} onCheckedChange={setQuiz} aria-label="Voice quiz mode" /></label>
        <label className="flex items-center justify-between gap-2"><Globe className="size-4 text-muted-foreground" />Search<Switch checked={search} disabled={locked} onCheckedChange={setSearch} aria-label="Voice live search" /></label>
        <label className="flex items-center justify-between gap-2"><FileText className="size-4 text-muted-foreground" />Read scans<Switch checked={ocr} disabled={locked || reading} onCheckedChange={setOcr} aria-label="Read scanned PDFs" /></label>
        <Select value={choice} onValueChange={(v) => setChoice(v as VoiceChoiceId)} disabled={locked}>
          <SelectTrigger aria-label="Voice" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{VOICE_CHOICES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        {locked && <p className="w-full text-xs text-muted-foreground">Ye options call ke dauran fixed hain — badalne ke liye End karke dobara Start karo.</p>}
        <Select value={textSize} onValueChange={(v) => setTextSize(v as StudyTextSize)}><SelectTrigger aria-label="Voice transcript text size"><SelectValue /></SelectTrigger><SelectContent>{STUDY_TEXT_SIZES.map((size) => <SelectItem key={size} value={size}>{size} px</SelectItem>)}</SelectContent></Select>
        <div className="flex gap-2 border-t pt-3">        <Button variant="ghost" size="icon" className="size-9" aria-label="Export conversation" title="Export conversation (.md)" onClick={exportCall}><Download className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Import conversation" title="Import conversation (.md / .json)" disabled={locked} onClick={() => importInput.current?.click()}><Upload className="size-4" /></Button>
</div>
      </div>
      {callId && <p className="mt-2 text-xs text-muted-foreground" title={callId}>Call {callId.slice(0, 8)} · {billableSeconds(usage, created) ?? '—'} billable seconds · {finalUsage ? 'Final usage received' : 'Final usage pending'} · Credits unconfirmed</p>}
          </SheetContent>
        </Sheet>
        <input ref={importInput} type="file" accept=".md,.markdown,.txt,.json" hidden onChange={(e) => { void importCall(e.target.files?.[0]); e.target.value = ""; }} />
      </header>

      {readProgress && <p role="status" className="mt-2 text-xs text-primary">{readProgress}</p>}

      <section
        ref={scrollRef}
        onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className={`voice-transcript study-text study-text-${textSize} min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-4 pr-1`}
        aria-label="Voice conversation"
        aria-live="polite"
      >
        {rows.length === 0 && (
          <div className="pt-12 text-center">
            <div className={cn("mx-auto mb-4 grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10", live && "animate-pulse")}>
              <Mic className="size-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Ready when you are</p>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={cn("msg-in min-w-0", r.role === "user" ? "ml-auto max-w-[90%]" : "w-full")}>
            <p className={cn("mb-1.5 text-xs font-medium text-muted-foreground", r.role === "user" && "text-right")}>{r.role === "user" ? 'You' : 'SnapSolve'}</p>
            <p className={cn("voice-caption whitespace-pre-wrap break-words text-foreground", r.role === "user" && "rounded-lg border border-primary/15 bg-user-bubble px-3 py-2")}>{r.text}</p>
          </div>
        ))}
        {thinking && (
          <div className="msg-in flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status">
            <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="think-dot size-1.5 rounded-full bg-primary" />)}</span>
            Claude jawab soch raha hai…
          </div>
        )}
      </section>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs">
              <FileText className="size-3.5 text-primary" />{f.name}
              {!locked && <Button variant="ghost" size="icon" className="size-5" aria-label={`Remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>}
            </span>
          ))}
        </div>
      )}
      {voice.error && (
        <p role="alert" className="mb-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{voice.error}</p>
      )}
      {quiz && question && <div className="max-h-[40dvh] shrink-0 overflow-y-auto pb-2">
        <QuizActions answersOnly timed options={VOICE_ANSWERS} labels={question.labels} questionKey={question.id} selectedAnswer={picked === VOICE_SKIP ? undefined : picked} disabled={!live || thinking || !!picked} onSend={(answer) => {
          if (!voice.submitAnswer(answer, question.id)) { toast.error("Start a connected call before answering."); return; }
          setThinking(true);
        }} />
      </div>}
      <audio ref={voice.audioRef} className="sr-only" />
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button size="icon" variant="outline" className="size-10 rounded-full" disabled={locked || reading} onClick={() => fileInput.current?.click()} aria-label="Attach PDF or notes" title="Attach PDF, notes, Word, PPTX">
          <Paperclip className="size-5" />
        </Button>
        <input ref={fileInput} type="file" multiple hidden accept="application/pdf,.pdf,.md,.txt,.docx,.pptx" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
        {voice.playbackBlocked && (
          <Button variant="outline" onClick={voice.resumePlayback}><Volume2 className="size-4" /> Play voice</Button>
        )}
        {canStart ? (
          <Button size="lg" className="rounded-full px-8" onClick={voice.start} disabled={reading}>
            <Phone className="size-4" /> {reading ? "Reading file…" : rows.length ? "Start again" : "Start"}
          </Button>
        ) : (
          <>
            <Button size="icon" variant="outline" className="size-10 rounded-full" disabled={!live} onClick={() => voice.setMuted(!voice.muted)} aria-label={voice.muted ? "Unmute" : "Mute"}>
              {voice.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>
            <Button size="lg" variant="destructive" className="rounded-full px-8" disabled={voice.status === "stopping"} onClick={voice.stop}>
              <PhoneOff className="size-4" /> End
            </Button>
          </>
        )}
      </footer>
    </main>
  );
}

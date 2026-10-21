import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, EyeOff, FileDown, FileText, FileType, Gauge, GraduationCap, Globe, Maximize2, MessageSquare, Mic, MicOff, Minimize2, Paperclip, Pause, PhoneOff, Phone, SendHorizontal, Upload, Volume2, X, SlidersHorizontal, Timer, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VOICE_CHAT_KEY, VOICE_CHAT_MAX, voiceChatText } from "@/lib/voice-chat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveVoice, PLAYBACK_SPEEDS, type LiveEvent, type LiveStage } from "@/hooks/use-live-voice";
import { useVoiceChoice, useStudyTextSize, STUDY_TEXT_SIZES, VOICE_CHOICES, type VoiceChoiceId, type StudyTextSize } from "@/lib/quiz-label-preference";
import { extractLocally } from "@/lib/file-extract";
import { cn } from "@/lib/utils";
import { parseVoiceSession, voiceTranscriptMarkdown, type VoiceQuizEntry, type VoiceRow } from "@/lib/voice-transcript";
import { prewarmLiveRelay } from "@/lib/live-endpoint";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { QuizActions } from "@/components/quiz-actions";
import { VOICE_ANSWERS, VOICE_SKIP, validVoiceAnswer } from "@/lib/voice-quiz";
import { readVoicePdf } from '@/lib/voice-pdf';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { resolveModel, VOICE_TUTOR_MODEL } from '@/lib/models';
import { billableSeconds, confirmedSeconds } from '@/lib/voice-usage';
import { QuizTimerSettings } from '@/components/quiz-timer-settings';
import { TalkVoice } from '@/components/talk-voice';
import { usesTalkTurns } from '@/lib/talk-turn';
import { initialVoiceQuizState, reduceVoiceQuiz } from '@/lib/voice-quiz-state';
import { AssistantAnswer } from '@/components/assistant-answer';
import { formatVoiceReply } from '@/lib/voice-format';
import { exportTranscriptWord, openTranscriptPdf } from '@/lib/transcript-export';

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
const TURN_GAP_MS = 2500;
const STAGE_LABEL: Record<LiveStage, string> = { mic: "Mic chalu…", network: "Network jod rahe…", tutor: "Tutor jud raha…", media: "Awaaz jod rahe…" };

async function readAttachment(file: File, ocr: boolean, progress: (message: string) => void): Promise<Omit<Attachment, 'name'>> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return readVoicePdf(file, ocr, progress);
  }
  return { text: (await extractLocally(file))?.trim() ?? '', pages: 0, method: 'text' };
}

function VoicePage() {
  const [talk, setTalk] = useState<boolean | null>(null);
  useEffect(() => { setTalk(usesTalkTurns(window.location.origin)); }, []);
  if (talk === null) return null;
  return talk ? <TalkVoice /> : <LiveVoicePage />;
}

function LiveVoicePage() {
  const [rows, setRows] = useState<Row[]>([]);
  // Every quiz question with its A–D options and the tapped answer, for revision exports.
  const [quizLog, setQuizLog] = useState<VoiceQuizEntry[]>([]);
  const [thinking, setThinking] = useState(false);
  const [quizState, dispatchQuiz] = useReducer(reduceVoiceQuiz, initialVoiceQuizState);
  const { question, pending, picked, retry: quizRetry } = quizState;
  const quizStateRef = useRef(quizState);
  quizStateRef.current = quizState;
  const [quiz, setQuiz] = useState(false);
  const [matchQ, setMatchQ] = useState(false);
  const [assertionQ, setAssertionQ] = useState(false);
  const [deep, setDeep] = useState(false);
  const [quizView, setQuizView] = useState<'question' | 'conversation'>('question');
  const questionScrollRef = useRef<HTMLDivElement>(null);
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
  const turnRef = useRef<Record<"user" | "assistant", { id: string; at: number } | null>>({ user: null, assistant: null });
  // Chat toggle: a text box to type to the tutor during the call (saved on this device).
  const [chat, setChat] = useState(false);
  const [draft, setDraft] = useState('');
  const typedRows = useRef(new Set<string>());
  const sentTyped = useRef(new Map<string, string>());
  useEffect(() => { try { setChat(window.localStorage.getItem(VOICE_CHAT_KEY) === "1"); } catch { /* storage unavailable */ } }, []);
  const changeChat = (on: boolean) => {
    setChat(on);
    try { window.localStorage.setItem(VOICE_CHAT_KEY, on ? "1" : "0"); } catch { /* storage unavailable */ }
  };

  // Auto-reconnect when the network drops an established call (max 2 tries).
  const wasLive = useRef(false);
  const dropRetries = useRef(0);
  const dropReconnect = useRef(false);

  const onEvent = useCallback((event: LiveEvent) => {
    dispatchQuiz(event);
    if (event.type === 'app.connected') { wasLive.current = true; dropRetries.current = 0; }
    if (event.type === 'app.closed') wasLive.current = false;
    if (event.type === 'app.dropped') {
      if (wasLive.current && dropRetries.current < 2) {
        dropRetries.current += 1;
        dropReconnect.current = true;
        wasLive.current = false;
        setReconnecting(true);
        toast("Connection tooti — call apne aap reconnect ho rahi hai…");
      }
    }
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
      setThinking(false);
      const entry: VoiceQuizEntry = { id: event.questionId, text: typeof event['text'] === 'string' ? event['text'] : '', labels: event.labels };
      setQuizLog((prev) => (prev.some((q) => q.id === entry.id) ? prev : [...prev, entry]));
    } else if (event.type === 'app.quiz.playback.ready' && typeof event.questionId === 'string') {
      if (quizStateRef.current.pending?.id === event.questionId) setThinking(false);
    } else if (event.type === "app.quiz.accepted" && (event.answer === VOICE_SKIP || validVoiceAnswer(event.answer))) {
      const current = quizStateRef.current.question;
      if (!current || event.questionId !== current.id || !event.answer) return;
      const answer = event.answer;
      const rowId = crypto.randomUUID();
      const label = answer === VOICE_SKIP ? '' : current.labels[answer] ?? '';
      setRows((prev) => [...prev, { id: rowId, role: "user", text: answer === VOICE_SKIP ? "Skipped (time up)" : `Answer ${answer}${label ? ` — ${label}` : ''}` }]);
      setQuizLog((prev) => prev.map((q) => (q.id === current.id ? { ...q, answer, answerRowId: rowId } : q)));
    } else if (event.type === "app.quiz.rejected") {
      if (event['retryable'] === false || event.questionId !== quizStateRef.current.question?.id || quizStateRef.current.pending) return;
      setThinking(false);
      toast.error(event.error?.message ?? "Answer could not be accepted.");
    } else if (event.type === "app.chat.accepted" && typeof event['text'] === 'string') {
      const id = typeof event['id'] === 'string' && event['id'] ? event['id'] : crypto.randomUUID();
      const text = event['text'];
      sentTyped.current.delete(id);
      // A typed message is its own row and a turn boundary: later speech and the tutor's reply start new rows.
      typedRows.current.add(id);
      turnRef.current = { user: null, assistant: null };
      setRows((prev) => (prev.some((r) => r.id === id) ? prev : [...prev, { id, role: "user", text }]));
      setThinking(true);
    } else if (event.type === "app.chat.rejected") {
      const id = typeof event['id'] === 'string' ? event['id'] : '';
      const text = sentTyped.current.get(id);
      sentTyped.current.delete(id);
      if (text) setDraft((d) => d || text);
      toast.error(event.error?.message ?? "Message nahi gaya.");
    } else if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
      const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
      const delta = typeof event["delta"] === "string" ? event["delta"] : "";
      if (!delta) return;
      // Student and tutor captions arrive interleaved while both talk; keep each
      // ongoing turn in one row instead of splitting it into fragments.
      const now = Date.now();
      const turn = turnRef.current[role];
      const fresh = !turn || now - turn.at > TURN_GAP_MS;
      const id = fresh ? crypto.randomUUID() : turn.id;
      turnRef.current[role] = { id, at: now };
      setRows((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && !typedRows.current.has(last.id)) { turnRef.current[role] = { id: last.id, at: now }; return [...prev.slice(0, -1), { ...last, text: last.text + delta }]; }
        const at = fresh ? -1 : prev.findIndex((r) => r.id === id);
        if (at >= 0) return prev.map((r, i) => (i === at ? { ...r, text: r.text + delta } : r));
        return [...prev, { id, role, text: delta }];
      });
    } else if (event.type === "app.delegation.pending") {
      setThinking(true);
    } else if (event.type === "app.delegation.completed" || event.type === "app.delegation.error" || event.type === "app.closed") {
      setThinking(false);
      if (event.type === 'app.delegation.error') toast.error(event.error?.message ?? 'Tutor answer could not finish.');
    }
  }, []);

  const prefs = useCallback(() => {
    const c = VOICE_CHOICES.find((v) => v.id === choice) ?? VOICE_CHOICES[0];
    const previous = rows.length ? `Previous conversation:\n${rows.map((r) => `${r.role === "user" ? "Student" : "Tutor"}: ${r.text}`).join("\n")}\n\n` : "";
    const docs = files.map((f) => `<doc name=${JSON.stringify(f.name)}>\n${f.text}\n</doc>`).join("\n\n");
    return { voice: c.voice, accent: c.accent, quiz, matchQ, assertionQ, deep, search, context: previous.slice(-Math.max(0, CONTEXT_LIMIT - docs.length)) + docs, documents: files.map(({ name, pages, method, text }) => ({ name, pages, method, chars: text.length })) };
  }, [choice, quiz, matchQ, assertionQ, deep, search, files, rows]);

  const voice = useLiveVoice({ onEvent, prefs });
  const canStart = voice.status === "idle" || voice.status === "closed";
  const live = voice.status === "connected";
  // Settings stay editable during a call; a change reconnects the call with the new settings and keeps the conversation.
  const locked = voice.status === "connecting" || voice.status === "stopping";
  const settingsKey = `${choice}|${quiz}|${matchQ}|${assertionQ}|${deep}|${search}|${files.map((f) => f.name).join(",")}`;
  const appliedKey = useRef(settingsKey);
  const restartWanted = useRef(false);
  const [reconnecting, setReconnecting] = useState(false);
  // Distraction-free full page: header, tabs and chips hide; transcript + quiz + call controls stay.
  const [zen, setZen] = useState(false);
  // The eye button alone hides and shows the call buttons during a live call:
  // it auto-hides after 3s of no taps; any tap on the call screen brings it back.
  // Outside a call the call buttons always show.
  const [dockVisible, setDockVisible] = useState(true);
  const [eyeVisible, setEyeVisible] = useState(true);
  const eyeTimer = useRef<number | null>(null);
  const pokeEye = useCallback(() => {
    setEyeVisible(true);
    if (eyeTimer.current !== null) clearTimeout(eyeTimer.current);
    eyeTimer.current = window.setTimeout(() => setEyeVisible(false), 3000);
  }, []);
  useEffect(() => {
    if (!live) { setDockVisible(true); setEyeVisible(true); if (eyeTimer.current !== null) clearTimeout(eyeTimer.current); return; }
    pokeEye();
    return () => { if (eyeTimer.current !== null) clearTimeout(eyeTimer.current); };
  }, [live, pokeEye]);
  // Warm a relay on another site (Vercel) so the first Start does not pay its cold start.
  useEffect(() => { prewarmLiveRelay(window.location.href); }, []);
  // Show how fast the call connected for a few seconds after it goes live.
  const [connectedNote, setConnectedNote] = useState<string | null>(null);
  useEffect(() => {
    if (!live || voice.connectMs === null) return;
    setConnectedNote(`${(voice.connectMs / 1000).toFixed(1)}s me juda`);
    const t = setTimeout(() => setConnectedNote(null), 6000);
    return () => clearTimeout(t);
  }, [live, voice.connectMs]);
  const changeSpeed = (value: string) => {
    const speed = Number(value);
    const applied = voice.setRate(speed);
    const pace = speed === 1 ? "normal speed" : speed < 1 ? "dheere" : "tez";
    toast(applied ? `Speed ${speed}× — tutor ab ${pace} bolega.` : live ? `Speed ${speed}× save hui — agli call se lagu hogi.` : `Speed ${speed}× — call shuru hote hi tutor ${pace} bolega.`);
  };
  const speedSelect = (className: string) => (
    <Select value={String(voice.rate)} onValueChange={changeSpeed}>
      <SelectTrigger aria-label="Tutor speaking speed" title="Tutor ki bolne ki speed" className={className}><Gauge className="size-4 shrink-0 text-muted-foreground" /><SelectValue /></SelectTrigger>
      <SelectContent>{PLAYBACK_SPEEDS.map((sp) => <SelectItem key={sp} value={String(sp)}>{sp}×</SelectItem>)}</SelectContent>
    </Select>
  );
  useEffect(() => {
    if (canStart) { appliedKey.current = settingsKey; return; }
    if (!live || settingsKey === appliedKey.current) return;
    const t = setTimeout(() => {
      appliedKey.current = settingsKey;
      restartWanted.current = true;
      setReconnecting(true);
      toast("Settings badli — call naye settings ke saath reconnect ho rahi hai…");
      voice.stop();
    }, 600);
    return () => clearTimeout(t);
  }, [settingsKey, live, canStart]);
  useEffect(() => {
    if (!canStart || !restartWanted.current) return;
    restartWanted.current = false;
    const t = setTimeout(() => { void Promise.resolve(voice.start()).finally(() => setReconnecting(false)); }, 300);
    return () => clearTimeout(t);
  }, [canStart]);
  // Reconnect after a network drop: the conversation rows stay, so the tutor
  // picks up with the same context once the new call connects.
  useEffect(() => {
    if (!canStart || !dropReconnect.current) return;
    dropReconnect.current = false;
    const t = setTimeout(() => { void Promise.resolve(voice.start()).finally(() => setReconnecting(false)); }, 800);
    return () => clearTimeout(t);
  }, [canStart]);
  const quizVisible = quiz && !!(question || pending);
  const showQuestion = quizVisible && quizView === 'question' && !zen;
  const displayedQuestion = pending ?? question;

  useEffect(() => {
    if (pending?.id || question?.id) setQuizView('question');
  }, [pending?.id, question?.id]);
  useEffect(() => {
    if (showQuestion) questionScrollRef.current?.scrollTo({ top: 0 });
  }, [displayedQuestion?.id, showQuestion]);

  // Follow the newest caption unless the student scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [rows, thinking, quizView]);

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

  const sendChat = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    const text = voiceChatText(draft);
    if (!text) {
      if (draft.trim()) toast.error(`Message ${VOICE_CHAT_MAX} akshar tak hi ho sakta hai.`);
      return;
    }
    const id = crypto.randomUUID();
    if (!voice.sendText(text, id)) {
      toast.error(live ? "Message nahi gaya — ek baar dobara bhejo." : "Pehle call shuru karo, phir likh kar bhejo.");
      return;
    }
    sentTyped.current.set(id, text);
    setDraft('');
  };

  const nothingToExport = () => { if (rows.length || quizLog.length) return false; toast.error("Abhi koi baat-cheet nahi hai."); return true; };
  const exportCall = () => {
    if (nothingToExport()) return;
    const blob = new Blob([voiceTranscriptMarkdown(rows, quizLog)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `snapsolve-voice-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCallWord = () => {
    if (nothingToExport()) return;
    exportTranscriptWord(voiceTranscriptMarkdown(rows, quizLog, { embedData: false }));
    toast.success(quizLog.length ? "Word file download ho rahi hai — har sawal ke A–D options aur tumhara jawab saath me." : "Word file download ho rahi hai — tables aur lists waise hi rahenge.");
  };

  const exportCallPdf = () => {
    if (nothingToExport()) return;
    if (!openTranscriptPdf(voiceTranscriptMarkdown(rows, quizLog, { embedData: false }))) toast.error("Popup block ho gaya — browser me popups allow karo, phir dobara dabao.");
  };

  const importCall = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = parseVoiceSession(await file.text());
      if (!imported.rows.length) throw new Error();
      setRows(imported.rows);
      setQuizLog(imported.quiz);
      toast.success(`${imported.rows.length} messages${imported.quiz.length ? ` + ${imported.quiz.length} quiz sawal` : ''} import hue — Start dabao, tutor wahi se aage badhega.`);
    } catch {
      toast.error("Ye file SnapSolve voice export nahi lagti.");
    }
  };

  // Eye toggle during a live call hides the details too (header, quiz tabs,
  // attached-file chips) along with the call buttons; the markdown transcript stays.
  const chromeHidden = !dockVisible && live;
  const status = reconnecting ? "Reconnecting…" : voice.status === "connecting" ? (voice.stage ? STAGE_LABEL[voice.stage] : "Connecting…") : live ? (voice.paused ? "Paused" : thinking ? "Soch raha hai…" : voice.muted ? "Muted" : connectedNote ? `Live · ${connectedNote}` : "Live · bolo") : voice.status === "stopping" ? "Ending…" : "Ready";

  return (
    <main className="relative mx-auto flex h-dvh min-h-0 w-full max-w-3xl flex-col overflow-hidden px-3 pt-2 sm:px-6" onPointerDown={live ? pokeEye : undefined}>
      {!zen && !chromeHidden && (
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
        {quiz && <div className="space-y-3 border-l-2 border-primary/40 pl-3">
          <label className="flex items-center justify-between gap-2 text-sm">Match the Following<Switch checked={matchQ} disabled={locked} onCheckedChange={setMatchQ} aria-label="Match the Following questions" /></label>
          <label className="flex items-center justify-between gap-2 text-sm">Assertion–Reason<Switch checked={assertionQ} disabled={locked} onCheckedChange={setAssertionQ} aria-label="Assertion Reason questions" /></label>
          <label className="flex items-center justify-between gap-2 text-sm">Advanced · deep NCERT Biology<Switch checked={deep} disabled={locked} onCheckedChange={setDeep} aria-label="Advanced deep NCERT questions" /></label>
        </div>}
        <label className="flex items-center justify-between gap-2"><Globe className="size-4 text-muted-foreground" />Search<Switch checked={search} disabled={locked} onCheckedChange={setSearch} aria-label="Voice live search" /></label>
        <label className="flex items-center justify-between gap-2"><MessageSquare className="size-4 text-muted-foreground" />Chat<Switch checked={chat} onCheckedChange={changeChat} aria-label="Voice chat box" /></label>
        <p className="-mt-3 text-xs text-muted-foreground">Call ke dauraan likh kar bhi sawal bhejo — tutor bol kar jawab dega aur transcript me dikhega.</p>
        <div className="flex items-center justify-between gap-2"><span>Bolne ki speed</span>{speedSelect("w-28")}</div>
        <p className="-mt-3 text-xs text-muted-foreground">Tutor khud tez ya dheere bolta hai — call ke beech me bhi badlo, reconnect nahi hota.</p>
        <label className="flex items-center justify-between gap-2"><FileText className="size-4 text-muted-foreground" />Read scans<Switch checked={ocr} disabled={locked || reading} onCheckedChange={setOcr} aria-label="Read scanned PDFs" /></label>
        <Select value={choice} onValueChange={(v) => setChoice(v as VoiceChoiceId)} disabled={locked}>
          <SelectTrigger aria-label="Voice" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{VOICE_CHOICES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        {!canStart && <p className="w-full text-xs text-muted-foreground">Call chalte hue bhi badal sakte ho — call apne aap naye settings ke saath reconnect hogi, baat-cheet wahi se aage chalegi.</p>}
        <Select value={textSize} onValueChange={(v) => setTextSize(v as StudyTextSize)}><SelectTrigger aria-label="Voice transcript text size"><SelectValue /></SelectTrigger><SelectContent>{STUDY_TEXT_SIZES.map((size) => <SelectItem key={size} value={size}>{size} px</SelectItem>)}</SelectContent></Select>
        <QuizTimerSettings />
        <div className="flex gap-2 border-t pt-3">        <Button variant="ghost" size="icon" className="size-9" aria-label="Export conversation" title="Export conversation (.md)" onClick={exportCall}><Download className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Export as Word" title="Export conversation (Word .doc — tables aur lists intact)" onClick={exportCallWord}><FileType className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Export as PDF" title="Export conversation (PDF — print dialog me Save as PDF chuno)" onClick={exportCallPdf}><FileDown className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Import conversation" title="Import conversation (.md / .json)" disabled={locked} onClick={() => importInput.current?.click()}><Upload className="size-4" /></Button>
</div>
      </div>
      {callId && <p className="mt-2 text-xs text-muted-foreground" title={callId}>Call {callId.slice(0, 8)} · {billableSeconds(usage, created) ?? '—'} billable seconds · {finalUsage ? 'Final usage received' : 'Final usage pending'} · Credits unconfirmed</p>}
          </SheetContent>
        </Sheet>
        <input ref={importInput} type="file" accept=".md,.markdown,.txt,.json" hidden onChange={(e) => { void importCall(e.target.files?.[0]); e.target.value = ""; }} />
      </header>
      )}

      {readProgress && <p role="status" className="mt-2 text-xs text-primary">{readProgress}</p>}

      {quizVisible && !zen && !chromeHidden && <nav aria-label="Voice quiz view" className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-1 border-b py-2">
        <Button variant={quizView === 'question' ? 'secondary' : 'ghost'} className="min-h-11 min-w-0 px-2" aria-pressed={quizView === 'question'} onClick={() => setQuizView('question')}><GraduationCap className="size-4 shrink-0" /><span className="truncate">Question</span></Button>
        <Button variant={quizView === 'conversation' ? 'secondary' : 'ghost'} className="min-h-11 min-w-0 px-2" aria-pressed={quizView === 'conversation'} onClick={() => setQuizView('conversation')}><FileText className="size-4 shrink-0" /><span className="truncate">Conversation</span>{thinking && <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />}</Button>
        {speedSelect("h-11 w-[5.5rem] gap-1 px-2")}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Export quiz with options" title="Quiz + options export (MD / Word / PDF)"><Download className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={exportCall}><Download className="size-4" />Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onSelect={exportCallWord}><FileType className="size-4" />Word (.doc)</DropdownMenuItem>
            <DropdownMenuItem onSelect={exportCallPdf}><FileDown className="size-4" />PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>}

      <section
        ref={scrollRef}
        onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className={`voice-transcript study-text study-text-${textSize} min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-4 pr-1 ${showQuestion ? 'hidden' : ''}`}
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
            {r.role === "user" ? (
              <p className="voice-caption whitespace-pre-wrap break-words rounded-lg border border-primary/15 bg-user-bubble px-3 py-2 text-foreground">{r.text}</p>
            ) : (
              <div className="voice-caption break-words text-foreground"><AssistantAnswer text={formatVoiceReply(r.text)} isAnimating={false} compact /></div>
            )}
          </div>
        ))}
        {thinking && (
          <div className="msg-in flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status">
            <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="think-dot size-1.5 rounded-full bg-primary" />)}</span>
            Claude jawab soch raha hai…
          </div>
        )}
      </section>

      {quizVisible && displayedQuestion && (zen || showQuestion) && <section className={`voice-quiz study-text study-text-${textSize} min-h-0 flex-1 flex-col py-3 flex`} aria-label="Voice quiz">
        <div ref={questionScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border bg-card p-3 sm:p-4">
          {pending && <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b pb-2 text-xs text-muted-foreground" role="status"><span className="inline-flex min-w-0 items-center gap-1"><Timer className="size-3.5 shrink-0" />Next question · listening</span><Button size="icon" variant="outline" className="size-11 shrink-0" aria-label="Show question and start timer" title="Show question and start timer" disabled={!live || voice.playbackBlocked} onClick={() => dispatchQuiz({ type: 'app.quiz.manual.ready', questionId: pending.id })}><Play className="size-4" /></Button></div>}
          <div className="voice-caption min-w-0 break-words pb-3 text-foreground" aria-label="Current quiz question"><AssistantAnswer text={formatVoiceReply(displayedQuestion.text, { options: false, feedbackToggle: true })} isAnimating={false} compact boldQuestion /></div>
        <QuizActions key={displayedQuestion.id} answersOnly timed timerPaused={!!pending || !quizState.ready || voice.playbackBlocked} retryKey={quizRetry} options={VOICE_ANSWERS} labels={displayedQuestion.labels} questionKey={displayedQuestion.id} selectedAnswer={pending || picked === VOICE_SKIP ? undefined : picked} disabled={!live || thinking || !!picked || !!pending} onSend={(answer) => {
          if (!question || !voice.submitAnswer(answer, question.id)) { toast.error("Start a connected call before answering."); return false; }
          dispatchQuiz({ type: 'app.quiz.submitted', questionId: question.id, answer });
          setThinking(true);
          setQuizView('conversation');
          return true;
        }} />
        </div>
      </section>}

      {files.length > 0 && !zen && !chromeHidden && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-2" aria-label="Attached study material">
          {files.map((f, i) => (
            <span key={i} className="flex min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs">
              <FileText className="size-3.5 shrink-0 text-primary" /><span className="min-w-0 truncate" title={f.name}>{f.name}</span>
              {!locked && <Button variant="ghost" size="icon" className="size-5" aria-label={`Remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>}
            </span>
          ))}
        </div>
      )}
      {voice.error && (
        <p role="alert" className="mb-2 max-h-24 shrink-0 overflow-y-auto rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{voice.error}</p>
      )}
      {chat && (
        <form onSubmit={sendChat} className={cn("mb-2 flex shrink-0 items-end gap-2", !dockVisible && live && "pb-[env(safe-area-inset-bottom)]")} aria-label="Type to the tutor">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendChat(); } }}
            rows={1}
            maxLength={VOICE_CHAT_MAX}
            disabled={!live}
            enterKeyHint="send"
            placeholder={live ? "Likh kar pucho… tutor bol kar jawab dega" : "Call shuru karo, phir yahan likho"}
            aria-label="Message to tutor"
            className="min-h-11 max-h-32 flex-1 resize-none py-2.5"
          />
          <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!live || !draft.trim()} aria-label="Send message" title="Bhejo (Enter)"><SendHorizontal className="size-4" /></Button>
        </form>
      )}
      <audio ref={voice.audioRef} className="sr-only" />
      <footer hidden={!dockVisible && live} className="voice-dock relative z-10 -mx-3 shrink-0 border-t bg-background/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-md items-end justify-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <Button type="button" size="icon" variant={zen ? "secondary" : "outline"} className="voice-dock-btn size-14 rounded-full" aria-pressed={zen} onClick={() => setZen((z) => !z)} aria-label={zen ? "Normal view" : "Full page distraction-free"} title={zen ? "Normal view" : "Full page — sirf baat-cheet, baaki sab gayab"}>
              {zen ? <Minimize2 className="size-6" /> : <Maximize2 className="size-6" />}
            </Button>
            <span className="text-[11px] text-muted-foreground">{zen ? "Normal" : "Full"}</span>
          </div>
          {!zen && (
          <div className="flex flex-col items-center gap-1">
            <Button type="button" size="icon" variant="outline" className="voice-dock-btn size-14 rounded-full" disabled={locked || reading} onClick={() => fileInput.current?.click()} aria-label="Attach PDF or notes" title="Attach PDF, notes, Word, PPTX">
              <Paperclip className="size-6" />
            </Button>
            <span className="text-[11px] text-muted-foreground">Attach</span>
          </div>
          )}
          <input ref={fileInput} type="file" multiple hidden accept="application/pdf,.pdf,.md,.txt,.docx,.pptx" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          {voice.playbackBlocked && (
            <div className="flex flex-col items-center gap-1">
              <Button type="button" size="icon" variant="outline" className="voice-dock-btn size-14 rounded-full" onClick={voice.resumePlayback} aria-label="Play voice"><Volume2 className="size-6" /></Button>
              <span className="text-[11px] text-muted-foreground">Play</span>
            </div>
          )}
          {canStart ? (
            <div className="flex flex-col items-center gap-1">
              <Button type="button" size="lg" className="voice-dock-btn h-14 min-w-36 rounded-full px-8 text-base" onClick={voice.start} disabled={reading}>
                <Phone className="size-5" /> {reading ? "Reading…" : rows.length ? "Start again" : "Start"}
              </Button>
              <span className="text-[11px] text-muted-foreground">Call</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <Button type="button" size="icon" variant={voice.muted ? "secondary" : "outline"} className="voice-dock-btn size-14 rounded-full" disabled={!live || voice.paused} aria-pressed={voice.muted} onClick={() => voice.setMuted(!voice.muted)} aria-label={voice.muted ? "Unmute" : "Mute"}>
                  {voice.muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                </Button>
                <span className="text-[11px] text-muted-foreground">{voice.muted ? "Unmute" : "Mute"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button type="button" size="icon" variant={voice.paused ? "secondary" : "outline"} className="voice-dock-btn size-14 rounded-full" disabled={!live} aria-pressed={voice.paused} onClick={() => voice.setPaused(!voice.paused)} aria-label={voice.paused ? "Resume call" : "Pause call"} title={voice.paused ? "Resume — wahi se aage" : "Pause — mic aur awaaz ruk jayegi"}>
                  {voice.paused ? <Play className="size-6" /> : <Pause className="size-6" />}
                </Button>
                <span className="text-[11px] text-muted-foreground">{voice.paused ? "Resume" : "Pause"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button type="button" size="lg" variant="destructive" className="voice-dock-btn h-14 min-w-36 rounded-full px-8 text-base" disabled={voice.status === "stopping"} onClick={voice.stop}>
                  <PhoneOff className="size-5" /> End
                </Button>
                <span className="text-[11px] text-muted-foreground">{voice.status === "stopping" ? "Ending…" : "End call"}</span>
              </div>
            </>
          )}
        </div>
      </footer>
      {/* Eye button: hides/shows the call buttons; auto-hides after 3s, any tap brings it back. */}
      {live && eyeVisible && (
        <div className={`pointer-events-none absolute inset-x-0 z-20 flex justify-end px-3 opacity-100 transition-all duration-300 ${dockVisible ? (chat ? "bottom-[calc(11rem+env(safe-area-inset-bottom))]" : "bottom-[calc(7.5rem+env(safe-area-inset-bottom))]") : chat ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"}`}>
          <Button type="button" size="icon" variant="outline" className="pointer-events-auto size-12 rounded-full bg-background/95 shadow-lg backdrop-blur" aria-pressed={!dockVisible} onClick={() => setDockVisible((v) => !v)} aria-label={dockVisible ? "Hide call buttons" : "Show call buttons"} title={dockVisible ? "Neeche ke buttons chhupao — dobara dabao to wapas aayenge (3 sec me khud chhup jayega)" : "Neeche ke buttons wapas dikhao"}>
            {dockVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </Button>
        </div>
      )}
    </main>
  );
}

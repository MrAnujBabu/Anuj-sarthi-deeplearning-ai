import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, GraduationCap, Globe, Mic, MicOff, Paperclip, PhoneOff, Phone, Upload, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { useVoiceChoice, VOICE_CHOICES, type VoiceChoiceId } from "@/lib/quiz-label-preference";
import { extractLocally } from "@/lib/file-extract";
import { cn } from "@/lib/utils";
import { parseVoiceTranscript, voiceTranscriptMarkdown, type VoiceRow } from "@/lib/voice-transcript";

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
type Attachment = { name: string; text: string };
const CONTEXT_LIMIT = 38_000;

async function readAttachment(file: File): Promise<string> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text).replace(/[ \t]+/g, " ").trim();
  }
  return (await extractLocally(file))?.trim() ?? "";
}

function VoicePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thinking, setThinking] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [search, setSearch] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reading, setReading] = useState(false);
  const [choice, setChoice] = useVoiceChoice();
  const scrollRef = useRef<HTMLElement>(null);
  const pinned = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
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
    const docs = files.map((f) => `<doc name="${f.name}">\n${f.text}\n</doc>`).join("\n\n");
    return { voice: c.voice, accent: c.accent, quiz, search, context: (previous + docs).slice(-CONTEXT_LIMIT) };
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
    try {
      for (const file of Array.from(list).slice(0, 4)) {
        if (file.size > 15 * 1024 * 1024) { toast.error(`${file.name} is over 15 MB.`); continue; }
        const text = await readAttachment(file).catch(() => "");
        if (!text) { toast.error(`${file.name}: koi text nahi mila (scanned PDF ya photo voice mode me nahi padhi jaati).`); continue; }
        setFiles((prev) => [...prev, { name: file.name.replace(/"/g, "'"), text: text.slice(0, CONTEXT_LIMIT) }]);
        toast.success(`${file.name} attached — tutor next call me padh lega.`);
      }
    } finally {
      setReading(false);
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
    <main className="mx-auto flex h-dvh max-w-2xl flex-col px-4 pt-3">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label="Back" className="grid size-9 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Voice mode</h1>
        <span role="status" className={cn("ml-auto flex items-center gap-2 rounded-full border px-3 py-1 text-xs", live ? "border-primary/40 text-primary" : "text-muted-foreground")}>
          {live && <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />}
          {status}
        </span>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Export conversation" title="Export conversation (.md)" onClick={exportCall}><Download className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Import conversation" title="Import conversation (.md / .json)" disabled={locked} onClick={() => importInput.current?.click()}><Upload className="size-4" /></Button>
        <input ref={importInput} type="file" accept=".md,.markdown,.txt,.json" hidden onChange={(e) => { void importCall(e.target.files?.[0]); e.target.value = ""; }} />
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card/60 px-3 py-2 text-sm">
        <label className="flex items-center gap-2"><GraduationCap className="size-4 text-muted-foreground" />Quiz<Switch checked={quiz} disabled={locked} onCheckedChange={setQuiz} aria-label="Voice quiz mode" /></label>
        <label className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" />Search<Switch checked={search} disabled={locked} onCheckedChange={setSearch} aria-label="Voice live search" /></label>
        <Select value={choice} onValueChange={(v) => setChoice(v as VoiceChoiceId)} disabled={locked}>
          <SelectTrigger aria-label="Voice" className="ml-auto h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{VOICE_CHOICES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        {locked && <p className="w-full text-xs text-muted-foreground">Ye options call ke dauran fixed hain — badalne ke liye End karke dobara Start karo.</p>}
      </div>

      <section
        ref={scrollRef}
        onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="flex-1 space-y-3 overflow-y-auto py-5"
        aria-live="polite"
      >
        {rows.length === 0 && (
          <div className="pt-14 text-center">
            <div className={cn("mx-auto mb-5 grid size-24 place-items-center rounded-full border border-primary/30 bg-primary/10", live && "animate-pulse")}>
              <Mic className="size-9 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Start dabao aur apna doubt bolo. Tutor bolkar jawab dega — type karne ki zarurat nahi.</p>
            <p className="mt-2 text-xs text-muted-foreground">PDF / notes attach karo, ya purani call import karo — tutor use yaad rakhega.</p>
          </div>
        )}
        {rows.map((r) => (
          <p key={r.id} className={cn("msg-in max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed", r.role === "user" ? "ml-auto rounded-br-md border border-primary/20 bg-user-bubble text-foreground" : "rounded-bl-md bg-card text-foreground")}>
            {r.text}
          </p>
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
              {!locked && <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="size-3.5" /></button>}
            </span>
          ))}
        </div>
      )}
      {voice.error && (
        <p role="alert" className="mb-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{voice.error}</p>
      )}
      <audio ref={voice.audioRef} className="sr-only" />
      <footer className="flex items-center justify-center gap-3 border-t py-3">
        <Button size="icon" variant="outline" className="size-12 rounded-full" disabled={locked || reading} onClick={() => fileInput.current?.click()} aria-label="Attach PDF or notes" title="Attach PDF, notes, Word, PPTX">
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
            <Button size="icon" variant="outline" className="size-12 rounded-full" disabled={!live} onClick={() => voice.setMuted(!voice.muted)} aria-label={voice.muted ? "Unmute" : "Mute"}>
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

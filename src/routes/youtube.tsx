import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { createParser } from 'eventsource-parser';
import { Play, Square, Youtube, AudioLines, ArrowLeft, Languages, Captions, ChevronDown, Link2, Upload, FileText, Ear, ShieldCheck, Paperclip, Loader2, X } from 'lucide-react';
import { readTranscriptFile, TRANSCRIPT_ACCEPT } from '@/lib/transcript-file';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SARVAM_VOICES, sarvamVoiceLabel, type SarvamVoice } from '@/lib/sarvam-speech';
import { fetchHindiSpeech, readYouTubeVoiceEngine, setYouTubeVoiceEngine, type YouTubeVoiceEngine } from '@/lib/youtube-speech';
import { decodePCM, SPEECH_SAMPLE_RATE } from '@/lib/stream-speech';
import { splitForSpeech } from '@/lib/youtube-hindi';
import { YouTubeDub } from '@/components/youtube-dub';
import { YouTubeNarrationDownload } from '@/components/youtube-narration-download';
import { ChannelPicker } from '@/components/interpreter/channel-picker';
import { RunProgress } from '@/components/interpreter/run-progress';
import { StudyLibrary } from '@/components/interpreter/study-library';
import { SourceBadges, TeamCard, BriefCard } from '@/components/interpreter/result-insights';
import { runInterpretation, liveDub, IDLE_STATE, type RunInput, type RunState } from '@/lib/interpret-client';
import { InterpretStreamError } from '@/lib/interpret-protocol';
import { INTERPRET_PIPELINE } from '@/lib/interpret-identity';
import { checkpointKey, doneCount, isRecoverable, loadCheckpoint, removeCheckpoint, saveCheckpoint, type Checkpoint, type CheckpointInput } from '@/lib/interpret-checkpoint';
import { INTERPRETERS, DEFAULT_INTERPRETER, interpreterInfo, type InterpreterId } from '@/lib/interpreter-models';
import {
  loadYouTubeStudy, saveYouTubeStudy, saveToLibrary, listLibrary, removeFromLibrary, libraryKey,
  saveUploadedMedia, loadUploadedMedia, type YouTubeResult, type LibraryEntry,
} from '@/lib/youtube-study-store';

export const Route = createFileRoute('/youtube')({
  head: () => ({ meta: [
    { title: 'Video → सरल हिंदी interpreter — SnapSolve' },
    { name: 'description', content: 'YouTube, website या phone की कोई भी video — Claude, GPT और Gemini की expert team उसे सरल Hindi में समझाती है, साथ चलती Hindi voice के साथ।' },
    { property: 'og:title', content: 'Video → सरल हिंदी interpreter — SnapSolve' },
    { property: 'og:description', content: 'Any video, explained in simple Hindi by a three-model expert interpreter team.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: YouTubeHindi,
});

type Mode = 'link' | 'file' | 'text';
const proxied = (url: string) => `/api/media-proxy?url=${encodeURIComponent(url)}`;

function YouTubeHindi() {
  const [mode, setMode] = useState<Mode>('link');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attached, setAttached] = useState<{ kind: 'text'; name: string; detail: string } | { kind: 'media'; file: File; name: string; detail: string } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const attachInput = useRef<HTMLInputElement>(null);
  const runIsFile = useRef(false);
  const [mediaObjectUrl, setMediaObjectUrl] = useState<string | null>(null);
  const [voice, setVoice] = useState<SarvamVoice>('ishita_hi_edtech');
  const [voiceEngine, setVoiceEngineState] = useState<YouTubeVoiceEngine>('sarvam');
  const [engine, setEngine] = useState<InterpreterId>(DEFAULT_INTERPRETER);
  const [quality, setQuality] = useState(true);
  const [deepListen, setDeepListen] = useState(false);
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<YouTubeResult | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [dubbing, setDubbing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [saved, setSaved] = useState<Checkpoint | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const runCtl = useRef<AbortController | null>(null);
  const busy = run !== null;
  const locked = busy || dubbing || playing || exporting;

  useEffect(() => () => { stopRef.current(); runCtl.current?.abort(); }, []);
  useEffect(() => () => { if (mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl); }, [mediaObjectUrl]);
  // Voice-engine toggle: restore the saved Sarvam/Lovable choice before any speech runs.
  useEffect(() => {
    const engine = readYouTubeVoiceEngine();
    setVoiceEngineState(engine);
    setYouTubeVoiceEngine(engine);
  }, []);
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const [saved, entries] = await Promise.all([loadYouTubeStudy(), listLibrary().catch(() => [])]);
        if (dead) return;
        setLibrary(entries);
        if (!saved) return;
        setUrl(saved.url); setTranscript(saved.transcript); setVoice(saved.voice); setResult(saved.result);
        if (saved.result.engine) setEngine(saved.result.engine);
        setActiveKey(libraryKey(saved.result, saved.url, saved.transcript));
        if (saved.result.source?.kind === 'upload') {
          const media = await loadUploadedMedia().catch(() => undefined);
          if (!dead && media?.id && media.id === saved.result.source.mediaId) setMediaObjectUrl(URL.createObjectURL(media.blob));
        }
      } catch { if (!dead) setError('Saved video खोल नहीं पाए।'); }
      finally { if (!dead) setRestoring(false); }
    })();
    return () => { dead = true; };
  }, []);

  async function remember(r: YouTubeResult, srcUrl: string, text: string) {
    const key = libraryKey(r, srcUrl, text);
    setActiveKey(key);
    try {
      await saveYouTubeStudy({ version: 1, url: srcUrl, transcript: text, voice, result: r });
      await saveToLibrary({ key, savedAt: Date.now(), url: srcUrl, voice, result: r });
      setLibrary(await listLibrary().catch(() => library));
      return true;
    } catch { setError('Hindi तैयार है, लेकिन इस device पर save नहीं हुआ। पिछला checkpoint रखा गया है।'); return false; }
  }

  async function attachTranscript(f: File) {
    setError(''); setReading(`${f.name} पढ़ रहा हूँ…`);
    try {
      const out = await readTranscriptFile(f, message => setReading(message));
      if (out.kind === 'media') {
        setAttached({ kind: 'media', file: out.file, name: f.name, detail: `${(f.size / 1048576).toFixed(1)} MB · Gemini सुनेगा` });
        return;
      }
      setTranscript(out.text);
      const notes = [`${out.text.length.toLocaleString('en-IN')} अक्षर`, out.pages ? `${out.pages} page` : '', out.scanned ? 'scan से पढ़ा — जाँच लें' : '', out.truncated ? 'शुरुआती हिस्सा' : ''].filter(Boolean);
      setAttached({ kind: 'text', name: f.name, detail: notes.join(' · ') });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'File नहीं पढ़ी जा सकी।');
    } finally { setReading(null); }
  }

  function clearAttachment() {
    if (attached?.kind === 'text') setTranscript('');
    setAttached(null);
  }

  function currentCheckpointInput(): CheckpointInput | null {
    if (mode === 'link') return url.trim() ? { kind: 'link', url } : null;
    if (mode === 'file') return file ? { kind: 'file', file } : null;
    if (attached?.kind === 'media') return { kind: 'file', file: attached.file };
    return transcript.trim() ? { kind: 'text', transcript, url } : null;
  }
  const savedKey = (() => { const i = currentCheckpointInput(); return i ? checkpointKey(i, engine, quality, deepListen) : ''; })();
  useEffect(() => {
    if (!savedKey || busy) { if (!savedKey) setSaved(null); return; }
    let dead = false;
    const t = setTimeout(() => { void loadCheckpoint(savedKey).then(cp => { if (!dead) setSaved(isRecoverable(cp) ? cp : null); }).catch(() => {}); }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [savedKey, busy]);

  async function discardSaved() {
    try { if (saved) await removeCheckpoint(saved.key); setSaved(null); }
    catch { setError('Saved progress हट नहीं पाया। फिर कोशिश करें।'); }
  }

  async function convert(override?: { url: string }) {
    let input: RunInput;
    const linkUrl = override?.url ?? url;
    if (override || mode === 'link') {
      if (!linkUrl.trim()) { setError('पहले video link paste करें।'); return; }
      input = { kind: 'link', url: linkUrl.trim(), deepListen };
    } else if (mode === 'file') {
      if (!file) { setError('पहले phone से video या audio चुनें।'); return; }
      input = { kind: 'file', file };
    } else if (attached?.kind === 'media') {
      input = { kind: 'file', file: attached.file };
    } else {
      if (!transcript.trim()) { setError('पहले transcript paste करें या file लगाएँ।'); return; }
      input = { kind: 'text', transcript: transcript.trim(), url: url.trim() };
    }
    runIsFile.current = input.kind === 'file';
    const cached = input.kind === 'link' ? library.find(e => e.url.trim() === linkUrl.trim() && e.result.engine === engine
      && e.result.pipeline === INTERPRET_PIPELINE && e.result.deepListen === deepListen
      && (!quality || (e.result.panel?.reviewRequested === true && e.result.panel.reviewed === e.result.panel.reviewTotal))) : undefined;
    if (cached) { openEntry(cached); return; }

    stopRef.current(); runCtl.current?.abort();
    const ctl = new AbortController(); runCtl.current = ctl;
    setError(''); setResult(null); setRun({ ...IDLE_STATE, stage: 'source', message: 'शुरू कर रहा हूँ…' });
    if (input.kind === 'file') {
      if (mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl);
      setMediaObjectUrl(URL.createObjectURL(input.file));
    }
    const key = checkpointKey(input.kind === 'file' ? { kind: 'file', file: input.file } : input, engine, quality, deepListen);
    const checkpoint = await loadCheckpoint(key).catch(() => null);
    // Save finished parts at most every 2 s (and once at the end) so a stop never loses paid work.
    let pending: Omit<Checkpoint, 'key' | 'savedAt'> | null = null, timer: ReturnType<typeof setTimeout> | null = null;
    let writes = Promise.resolve();
    const flush = async () => {
      if (timer) { clearTimeout(timer); timer = null; }
      const cp = pending; pending = null;
      if (cp) writes = writes.then(() => saveCheckpoint({ ...cp, key, savedAt: Date.now() })).catch(() => { setError('इस device पर प्रगति save नहीं हुई। पेज बंद करने पर काम खो सकता है।'); });
      await writes;
    };
    const onCheckpoint = (cp: Omit<Checkpoint, 'key' | 'savedAt'>) => { pending = cp; timer ??= setTimeout(() => { void flush(); }, 2000); };
    let finished = false;
    try {
      let r = await runInterpretation({ input, engine, quality, signal: ctl.signal, checkpoint, onCheckpoint, onState: s => { if (!ctl.signal.aborted) setRun(s); } });
      await flush();
      if (ctl.signal.aborted) return;
      setResult(r);
      if (input.kind === 'file') {
        const id = crypto.randomUUID();
        r = { ...r, source: { kind: 'upload', origin: 'listened', ...r.source, mediaId: id } }; setResult(r);
        const kept = await saveUploadedMedia({ name: input.file.name, type: input.file.type, blob: input.file, id }).catch(() => false);
        if (!kept) setError('Hindi तैयार है; मूल video इस device पर save नहीं हुई।');
      }
      finished = await remember(r, input.kind === 'link' ? input.url : input.kind === 'text' ? (input.url ?? '') : '', input.kind === 'text' ? input.transcript : '');
      if (finished) { await removeCheckpoint(key).catch(() => {}); setSaved(null); }
    } catch (e) {
      if (ctl.signal.aborted) return;
      if (e instanceof InterpretStreamError && e.needTranscript) { setMode('text'); setError(`${e.message} — Transcript किसी भी भाषा में जोड़ें, या Phone से अपनी video/audio file चुनें।`); }
      else setError(e instanceof Error ? e.message : 'कुछ गड़बड़ हो गई।');
    } finally {
      if (!finished) {
        await flush();
        const cp = await loadCheckpoint(key).catch(() => null);
        setSaved(isRecoverable(cp) ? cp : null);
      }
      if (runCtl.current === ctl) { runCtl.current = null; setRun(null); }
    }
  }

  function cancel() { runCtl.current?.abort(); runCtl.current = null; setRun(null); }

  function openEntry(entry: LibraryEntry) {
    stopRef.current(); setError(''); setResult(entry.result); setActiveKey(entry.key); setVoice(entry.voice);
    setMediaObjectUrl(null);
    if (entry.result.engine) setEngine(entry.result.engine);
    if (entry.url) setUrl(entry.url);
    void saveYouTubeStudy({ version: 1, url: entry.url, transcript: '', voice: entry.voice, result: entry.result }).catch(() => {});
    if (entry.result.source?.kind === 'upload') void loadUploadedMedia().then(m => {
      if (m?.id && m.id === entry.result.source?.mediaId) setMediaObjectUrl(URL.createObjectURL(m.blob));
    }).catch(() => {});
  }

  async function removeEntry(entry: LibraryEntry) {
    await removeFromLibrary(entry.key).catch(() => {});
    setLibrary(await listLibrary().catch(() => []));
  }

  async function play() {
    if (!result) return;
    const ctl = new AbortController();
    const ctx = new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE });
    let playhead = ctx.currentTime + 0.2;
    const sources = new Set<AudioBufferSourceNode>();
    stopRef.current = () => { ctl.abort(); sources.forEach(s => { try { s.stop(); } catch { /* done */ } s.disconnect(); }); sources.clear(); void ctx.close(); setPlaying(false); setProgress(''); };
    setPlaying(true); setError('');
    const pieces = splitForSpeech(result.hindi);
    try {
      await ctx.resume();
      for (let i = 0; i < pieces.length; i++) {
        while (playhead - ctx.currentTime > 30) { ctl.signal.throwIfAborted(); await new Promise(resolve => setTimeout(resolve, 200)); }
        setProgress(`Part ${i + 1} / ${pieces.length}`);
        const piece = pieces[i]; if (!piece) continue;
        const res = await fetchHindiSpeech(piece, voice, ctl.signal, Date.now(), voiceEngine);
        if (!res.body) throw new Error('No audio.');
        let pending: Uint8Array = new Uint8Array(0);
        let failure = '';
        const parser = createParser({ onEvent: (ev) => {
          const d = JSON.parse(ev.data) as { type: string; audio?: string; error?: string };
          if (d.type === 'error') failure = d.error || 'Speech failed.';
          if (d.type !== 'speech.audio.delta' || !d.audio) return;
          const bin = Uint8Array.from(atob(d.audio), c => c.charCodeAt(0));
          const out = decodePCM(pending, bin); pending = out.pending;
          if (!out.samples.length) return;
          const buf = ctx.createBuffer(1, out.samples.length, SPEECH_SAMPLE_RATE);
          buf.copyToChannel(out.samples as Float32Array<ArrayBuffer>, 0);
          const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
          playhead = Math.max(playhead, ctx.currentTime + 0.05);
          src.onended = () => { sources.delete(src); src.disconnect(); };
          src.start(playhead); playhead += buf.duration; sources.add(src);
        } });
        const reader = res.body.getReader(); const dec = new TextDecoder();
        for (;;) { const { done, value } = await reader.read(); if (done) break; parser.feed(dec.decode(value, { stream: true })); }
        if (failure) throw new Error(failure);
      }
      const left = playhead - ctx.currentTime;
      setProgress('Playing…');
      await new Promise(r => setTimeout(r, Math.max(0, left * 1000)));
      if (!ctl.signal.aborted) stopRef.current();
    } catch (e) {
      if (!ctl.signal.aborted) { setError(e instanceof Error ? e.message : 'Speech failed.'); stopRef.current(); }
    }
  }

  // Live voice-over while the team is still interpreting (timed sources only).
  const live = run && run.timeline.length && run.hindi.some(Boolean) ? liveDub(run) : null;
  const liveVideoId = run?.videoId ?? null;
  const liveMedia = run?.mediaUrl ?? (run?.origin === 'listened' && runIsFile.current ? mediaObjectUrl : null);
  const resultMedia = result?.source?.kind === 'upload' ? mediaObjectUrl : result?.source?.mediaUrl ?? null;
  const fallbackFor = (src: string | null) => (src && /^https?:/.test(src) ? proxied(src) : null);
  const engineName = interpreterInfo(engine).name;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />SnapSolve</Link>
      <header className="mt-8 border-b pb-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-primary"><Languages className="size-4" />Expert interpreter</div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold sm:text-4xl"><Youtube className="size-8 shrink-0 text-primary" />कोई भी video → सरल हिंदी</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Gemini 4 Argon सुनता है, GPT-6 Astra ज़रूरी शब्दों की list बनाता है, {engineName} सरल Hindi में समझाता है{quality ? ', और दूसरी company का model हर हिस्सा दोबारा जाँचता है' : ''}।</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><AudioLines className="size-4" />Sarvam · Bulbul v4-flash</span><span>Lovable AI credits लागू</span></div>
      </header>

      <div className="mt-6 space-y-4">
        <Tabs value={mode} onValueChange={v => { setMode(v as Mode); setError(''); }}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="link" disabled={locked}><Link2 className="size-4" />Link</TabsTrigger>
            <TabsTrigger value="file" disabled={locked}><Upload className="size-4" />Phone से</TabsTrigger>
            <TabsTrigger value="text" disabled={locked}><FileText className="size-4" />Transcript</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'link' && <>
          <label className="block text-sm font-medium" htmlFor="video-link">YouTube या किसी website की video का link</label>
          <Input id="video-link" disabled={locked} className="h-12" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          <div className="flex items-center gap-2"><Switch id="deep-listen" checked={deepListen} onCheckedChange={setDeepListen} disabled={locked} /><Label htmlFor="deep-listen" className="flex items-center gap-1.5 text-sm"><Ear className="size-4" />Captions छोड़कर Gemini से पूरी आवाज़ सुनवाओ</Label></div>
        </>}
        {mode === 'file' && <>
          <label className="block text-sm font-medium" htmlFor="video-file">Phone से video या audio चुनें</label>
          <Input id="video-file" type="file" accept="video/*,audio/*" disabled={locked} className="h-12" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground">Video इसी device पर खुलती है; सिर्फ़ आवाज़ के छोटे हिस्से सुनने के लिए भेजे जाते हैं।</p>
        </>}
        {mode === 'text' && <>
          <div
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && !locked) void attachTranscript(f); }}
            className="space-y-3"
          >
            {attached?.kind === 'media'
              ? <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-6 text-center">
                  <Ear className="size-6 text-primary" />
                  <p className="text-sm font-medium">{attached.file.name}</p>
                  <p className="text-xs text-muted-foreground">Gemini 4 Argon इस file की आवाज़ सुनकर transcript बनाएगा।</p>
                </div>
              : <Textarea value={transcript} disabled={locked || reading !== null} onChange={e => { setTranscript(e.target.value); if (attached) setAttached(null); }} rows={7} placeholder="Video का transcript यहाँ paste करें, या नीचे से MD / PDF / subtitle / video file लगाएँ" aria-label="Transcript" />}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={attachInput} type="file" accept={TRANSCRIPT_ACCEPT} className="sr-only" aria-label="Transcript file" tabIndex={-1}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attachTranscript(f); }} />
              <Button type="button" variant="outline" size="sm" disabled={locked || reading !== null} onClick={() => attachInput.current?.click()}>
                {reading !== null ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}File लगाएँ
              </Button>
              <span className="text-xs text-muted-foreground">MD · TXT · PDF · DOCX · SRT · VTT · Video/Audio</span>
            </div>
            {reading !== null && <p className="text-xs text-muted-foreground" aria-live="polite">{reading}</p>}
            {attached && reading === null && (
              <div className="flex items-center gap-2 rounded-lg border bg-accent px-3 py-2 text-sm">
                {attached.kind === 'media' ? <Upload className="size-4 shrink-0 text-primary" /> : <FileText className="size-4 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1 truncate">{attached.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{attached.detail}</span>
                <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" disabled={locked} aria-label="File हटाओ" onClick={clearAttachment}><X className="size-4" /></Button>
              </div>
            )}
          </div>
          <Input disabled={locked} value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube link (optional — साथ में Hindi voice चलाने के लिए)" aria-label="Optional YouTube link" />
        </>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Select disabled={locked} value={engine} onValueChange={v => setEngine(v as InterpreterId)}>
            <SelectTrigger className="h-11 w-full" aria-label="Interpreter"><SelectValue /></SelectTrigger>
            <SelectContent>{INTERPRETERS.map(m => <SelectItem key={m.id} value={m.id}>{m.name} — {m.note}</SelectItem>)}</SelectContent>
          </Select>
          <Select disabled={locked} value={voice} onValueChange={v => setVoice(v as SarvamVoice)}>
            <SelectTrigger className="h-11 w-full" aria-label="Voice"><SelectValue /></SelectTrigger>
            <SelectContent>{SARVAM_VOICES.map(v => <SelectItem key={v} value={v}>{sarvamVoiceLabel(v)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm" htmlFor="voice-engine">
          <Switch id="voice-engine" checked={voiceEngine === 'sarvam'} disabled={locked} aria-label="Voice engine: Sarvam ya Lovable"
            onCheckedChange={(on) => { const next = on ? 'sarvam' : 'lovable' as const; setVoiceEngineState(next); setYouTubeVoiceEngine(next); }} />
          Sarvam awaaz
          <span className="text-xs text-muted-foreground">{voiceEngine === 'sarvam' ? 'pehle Sarvam · fail hone par Lovable backup' : 'hamesha Lovable AI ki awaaz'}</span>
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2"><Switch id="quality" checked={quality} onCheckedChange={setQuality} disabled={locked} /><Label htmlFor="quality" className="flex items-center gap-1.5 text-sm"><ShieldCheck className="size-4" />दूसरे model से दोबारा जाँच</Label></div>
          <Button className="h-11 sm:ml-auto" onClick={() => void convert()} disabled={restoring || locked}><Languages className="size-4" />{saved && !busy ? 'जहाँ रुका वहीं से आगे' : 'Hindi में समझाओ'}</Button>
        </div>
        {saved && !busy && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-accent/60 px-3 py-2 text-sm text-accent-foreground" data-testid="saved-progress">
            <span>इस device पर {doneCount(saved.lines)}/{saved.lines.length} हिस्से save हैं। स्रोत मिलने पर पुराना Hindi दोबारा नहीं बनेगा; माँगी गई जाँच के credits लग सकते हैं।</span>
            <Button type="button" variant="link" size="sm" onClick={() => void discardSaved()}>नए सिरे से</Button>
          </p>
        )}
        {error && <p role="alert" className="rounded-lg border border-destructive px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>

      {mode === 'link' && !busy && <div className="mt-8"><ChannelPicker disabled={locked} onPick={v => { const u = `https://www.youtube.com/watch?v=${v.id}`; setUrl(u); void convert({ url: u }); }} /></div>}

      {run && (
        <div className="mt-8 space-y-4">
          <RunProgress state={run} interpreter={engineName} quality={quality} onCancel={cancel} />
          {live && (liveVideoId || liveMedia) ? (
            <YouTubeDub videoId={liveVideoId} mediaSrc={liveMedia} mediaFallbackSrc={fallbackFor(liveMedia)} segments={live} original={run.timeline.map(s => s.text)} voice={voice} voiceEngine={voiceEngine} onRunningChange={setDubbing} />
          ) : null}
        </div>
      )}

      {result && !run && (
        <section className="mt-10 border-t pt-6">
          {result.title && <h2 className="mb-3 text-xl font-semibold">{result.title}</h2>}
          <SourceBadges result={result} />
          {result.truncated && <p className="mt-2 text-xs text-muted-foreground">Video लंबा है — शुरुआती हिस्सा ही समझाया गया है।</p>}
          {result.dub?.length && (result.videoId || resultMedia) ? (
            <div className="mt-4"><YouTubeDub videoId={result.videoId ?? null} mediaSrc={resultMedia} mediaFallbackSrc={fallbackFor(resultMedia)} segments={result.dub} {...(result.original ? { original: result.original } : {})} voice={voice} voiceEngine={voiceEngine} onRunningChange={setDubbing} /></div>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2"><TeamCard result={result} /><BriefCard result={result} /></div>
          <YouTubeNarrationDownload text={result.hindi} voice={voice} voiceEngine={voiceEngine} videoId={result.videoId ?? null} disabled={busy || dubbing || playing} onBusyChange={setExporting} />
          <details className="mt-8 border-t pt-4" open={!result.dub?.length}>
            <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium">सरल Hindi explanation<ChevronDown className="size-4" /></summary>
            <div className="mt-3 flex items-center gap-3">
              {playing
                ? <Button variant="outline" onClick={() => stopRef.current()}><Square className="size-4" />Stop</Button>
                : <Button onClick={play} disabled={dubbing || exporting}><Play className="size-4" />Hindi audio सुनो</Button>}
              <span className="text-xs text-muted-foreground">{progress}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{result.hindi}</p>
          </details>
        </section>
      )}

      {!run && <StudyLibrary entries={library} activeKey={activeKey} disabled={locked} onOpen={openEntry} onRemove={e => void removeEntry(e)} />}
      {!result && !run && !library.length && mode === 'text' && <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Captions className="size-4" />Transcript या file लगाने पर भी पूरी team वही expert जाँच करती है।</p>}
    </main>
  );
}

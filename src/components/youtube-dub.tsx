import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Play, Square, Pause, AudioLines, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fetchHindiSpeech, speechState } from '@/lib/youtube-speech';
import { SPEECH_SAMPLE_RATE } from '@/lib/stream-speech';
import { readDubAudio } from '@/lib/youtube-audio';
import { runDubPlayback, type DubPlayer } from '@/lib/youtube-dub-sync';
import { htmlMediaDubPlayer } from '@/lib/html-media-player';
import type { DubSegment } from '@/lib/youtube-hindi';
import type { SarvamVoice } from '@/lib/sarvam-speech';

type YTPlayer = DubPlayer & { destroy(): void };
declare global { interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise<void>(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  });
  return apiPromise;
}

export function formatTime(sec: number) {
  const t = Math.floor(sec); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}

const tick = () => new Promise(resolve => setTimeout(resolve, 250));

/**
 * Plays the Hindi voice-over in sync with a YouTube video or any HTML5 video/audio file.
 * Segments may still be filling in (live interpretation); playback waits at a segment whose
 * Hindi is not ready yet, so long podcasts can start before the whole interpretation finishes.
 */
export function YouTubeDub({ videoId, mediaSrc, mediaFallbackSrc, segments, original, voice, onRunningChange }: {
  videoId?: string | null; mediaSrc?: string | null; mediaFallbackSrc?: string | null;
  segments: DubSegment[]; original?: string[]; voice: SarvamVoice; onRunningChange?: (value: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null), player = useRef<DubPlayer | null>(null);
  const timestamps = useRef<HTMLOListElement>(null);
  const stopRef = useRef<() => void>(() => {}), generation = useRef(0);
  const intentPaused = useRef(false), holding = useRef(false);
  const buffers = useRef(new Map<number, AudioBuffer>());
  const latest = useRef(segments); latest.current = segments;
  const [ready, setReady] = useState(false), [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false), [status, setStatus] = useState('');
  const [current, setCurrent] = useState(-1), [error, setError] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [src, setSrc] = useState(mediaSrc ?? null);
  const [provider, setProvider] = useState('Sarvam · Bulbul v4-flash');
  const timeline = `${videoId ?? mediaSrc ?? ''}|${segments.length}|${segments[0]?.start ?? 0}|${segments.at(-1)?.end ?? 0}`;
  const readyCount = useMemo(() => segments.filter(s => s.hindi.trim()).length, [segments]);

  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);
  useEffect(() => {
    const list = timestamps.current;
    if (!list || current < 0) return;
    const row = list.children.item(current);
    if (!(row instanceof HTMLElement)) return;
    const parent = list.getBoundingClientRect(), bounds = row.getBoundingClientRect();
    if (bounds.top < parent.top || bounds.bottom > parent.bottom) {
      list.scrollTo({ top: list.scrollTop + bounds.top - parent.top - (list.clientHeight - bounds.height) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [current]);
  // A new timeline or voice restarts; Hindi lines filling in during live interpretation do not.
  useEffect(() => { stopRef.current(); buffers.current.clear(); }, [voice, timeline]);
  useEffect(() => { setSrc(mediaSrc ?? null); }, [mediaSrc]);

  useEffect(() => {
    if (!videoId) return;
    let dead = false;
    let yt: YTPlayer | null = null;
    void loadYouTubeApi().then(() => {
      if (dead || !host.current || !window.YT) return;
      const el = document.createElement('div'); host.current.appendChild(el);
      yt = new window.YT.Player(el, { videoId, width: '100%', height: '100%', playerVars: { rel: 0, playsinline: 1, cc_load_policy: 0 }, events: {
        onReady: () => { if (!dead) { player.current = yt; setReady(true); } },
        onError: () => { if (!dead) { stopRef.current(); setError('यह video यहाँ नहीं चल सकती। ऊपर Hindi text पढ़ें या audio download करें।'); } },
      } });
    });
    return () => { dead = true; stopRef.current(); yt?.destroy(); player.current = null; setReady(false); };
  }, [videoId]);

  useEffect(() => {
    if (videoId || !src || !video.current) return;
    const el = video.current;
    const onReady = () => { player.current = htmlMediaDubPlayer(el); setReady(true); setError(''); };
    const onError = () => {
      if (mediaFallbackSrc && src !== mediaFallbackSrc) { setReady(false); setSrc(mediaFallbackSrc); return; }
      stopRef.current(); setReady(false);
      setError('यह video यहाँ नहीं चल पाई। Hindi text पढ़ें या नीचे से Hindi audio download करें।');
    };
    el.addEventListener('loadedmetadata', onReady); el.addEventListener('error', onError);
    if (el.readyState >= 1) onReady();
    return () => { el.removeEventListener('loadedmetadata', onReady); el.removeEventListener('error', onError); stopRef.current(); player.current = null; setReady(false); };
  }, [videoId, src, mediaFallbackSrc]);

  async function start(from = 0) {
    const p = player.current; if (!p || !segments[from]) return;
    stopRef.current();
    const id = ++generation.current, ctl = new AbortController();
    const ctx = new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE });
    intentPaused.current = false; setPaused(false); setRunning(true); setError('');
    let disposed = false;
    const finish = () => {
      if (disposed) return; disposed = true;
      ctl.abort(); void ctx.close().catch(() => {});
      if (generation.current !== id) return;
      generation.current++; p.pauseVideo(); p.unMute(); setRunning(false); setCurrent(-1); setPaused(false);
      stopRef.current = () => {};
    };
    stopRef.current = () => { finish(); setStatus(''); };
    const pending = new Map<number, Promise<AudioBuffer>>();
    const waitForText = async (i: number) => {
      while (!latest.current[i]?.hindi.trim()) { ctl.signal.throwIfAborted(); await tick(); }
      return latest.current[i]?.hindi ?? '';
    };
    const getAudio = (i: number): Promise<AudioBuffer> => {
      const cached = buffers.current.get(i); if (cached) return Promise.resolve(cached);
      const existing = pending.get(i); if (existing) return existing;
      if (!segments[i]) return Promise.reject(new Error('Missing segment.'));
      const promise = waitForText(i).then(text => fetchHindiSpeech(text, voice, ctl.signal)).then(response => readDubAudio(response, ctx, ctl.signal)).then(buffer => {
        if (generation.current === id) {
          buffers.current.set(i, buffer);
          // Bounded device memory: keep recent/look-ahead audio for replay, never an entire long lecture.
          while (buffers.current.size > 8) { const oldest = buffers.current.keys().next().value; if (oldest === undefined) break; buffers.current.delete(oldest); }
          setProvider(speechState.useBackup ? 'Lovable AI · Gemini 2.5 Pro TTS' : 'Sarvam · Bulbul v4-flash');
        }
        return buffer;
      });
      promise.catch(() => {}); pending.set(i, promise); return promise;
    };
    try {
      await runDubPlayback({ player: p, context: ctx, segments, from, signal: ctl.signal, getAudio,
        readyAudio: i => buffers.current.get(i),
        active: () => generation.current === id,
        paused: () => intentPaused.current, holding: value => { if (generation.current === id) holding.current = value; },
        update: (i, text) => { if (generation.current === id) { setCurrent(i); setStatus(i >= 0 && !latest.current[i]?.hindi.trim() ? 'यह हिस्सा अभी समझाया जा रहा है…' : text); } },
      });
    } catch (e) {
      if (!ctl.signal.aborted && generation.current === id) setError(e instanceof Error ? e.message : 'Voice-over failed.');
    } finally { finish(); }
  }
  function togglePause() {
    intentPaused.current = !intentPaused.current; setPaused(intentPaused.current);
    if (intentPaused.current) player.current?.pauseVideo();
    else if (!holding.current) player.current?.playVideo();
  }
  const hasOriginal = !!original?.length && original.length === segments.length;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-40px_color-mix(in_oklab,var(--foreground)_45%,transparent)]">
      {videoId
        ? <div className="aspect-video w-full bg-muted [&_iframe]:size-full" ref={host} />
        : src ? <video ref={video} src={src} controls playsInline preload="metadata" className="aspect-video w-full bg-foreground/90" />
        : null}
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {running ? <>
            <Button variant="secondary" className="touch-btn" onClick={togglePause} aria-label={paused ? 'Resume Hindi voice-over' : 'Pause Hindi voice-over'}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}{paused ? 'जारी रखें' : 'Pause'}</Button>
            <Button variant="outline" size="icon" className="touch-btn" aria-label="Stop Hindi voice-over" title="Stop" onClick={() => stopRef.current()}><Square className="size-4" /></Button>
          </> : <Button className="touch-btn" onClick={() => start(0)} disabled={!ready || !segments.length}>{ready ? <Play className="size-4" /> : <Loader2 className="size-4 animate-spin" />}Hindi voice-over चलाओ</Button>}
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" data-testid="dub-status" role="status">{paused ? 'Paused' : status}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><AudioLines className="size-4 text-primary" />{provider}</span>
          <span className="tabular-nums">{readyCount < segments.length ? `${readyCount}/${segments.length} हिस्से तैयार` : `${segments.length} हिस्से`} · {formatTime(segments.at(-1)?.end ?? 0)}</span>
          {hasOriginal && <span className="flex items-center gap-2"><Switch id="show-original" checked={showOriginal} onCheckedChange={setShowOriginal} /><Label htmlFor="show-original" className="text-xs font-normal">Original भी दिखाओ</Label></span>}
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
      <ol ref={timestamps} className="max-h-[26rem] divide-y overflow-y-auto border-t" aria-label="Timestamped Hindi voice-over">
        {segments.map((seg, i) => <li key={i}>
          <Button variant="ghost" disabled={!ready} onClick={() => start(i)} data-current={i === current}
            className="h-auto w-full items-start justify-start gap-3 rounded-none border-l-2 border-transparent px-4 py-3 text-left whitespace-normal data-[current=true]:border-primary data-[current=true]:bg-accent">
            <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary tabular-nums">{formatTime(seg.start)}</span>
            <span className="min-w-0 space-y-1">
              {seg.hindi.trim()
                ? <span className="block text-sm leading-relaxed text-foreground">{seg.hindi}</span>
                : <span className="flex items-center gap-2 text-sm text-muted-foreground"><Languages className="size-3.5 animate-pulse text-primary" />समझा रहा हूँ…</span>}
              {showOriginal && hasOriginal && <span className="block text-xs leading-relaxed text-muted-foreground">{original?.[i]}</span>}
            </span>
          </Button>
        </li>)}
      </ol>
      {current >= 0 && segments[current]?.hindi && <p className="border-t border-l-4 border-l-primary bg-muted/60 px-4 py-3 text-sm leading-relaxed" data-testid="dub-caption">{segments[current]?.hindi}</p>}
    </div>
  );
}

import { AudioLines, Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHydrated, Link } from '@tanstack/react-router';
import { toast } from "sonner";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { recordWav, type Recording } from "@/lib/record-wav";
import { readTranscript } from '@/lib/transcription';
import { displayAiError, isCreditError } from '@/lib/ai/errors';

function setTextarea(el: HTMLTextAreaElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function DictateButton({ disabled }: { disabled?: boolean }) {
  const hydrated = useHydrated();
  const [state, setState] = useState<'idle' | 'starting' | 'rec' | 'busy'>('idle');
  const [secs, setSecs] = useState(0);
  const [creditError, setCreditError] = useState('');
  const rec = useRef<Recording | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; rec.current?.cancel(); controller.current?.abort();
  }; }, []);
  // Live mode: text committed so far, the in-flight segment queue, and the composer prefix.
  const live = useRef<{ prefix: string; done: string; queue: Promise<void>; textarea?: HTMLTextAreaElement | null | undefined; abort: AbortController; failed?: string | undefined } | null>(null);
  useEffect(() => {
    if (state !== 'rec') return;
    const started = Date.now();
    const timer = setInterval(() => {
      setSecs(Math.floor((Date.now() - started) / 1000));
      const r = rec.current, l = live.current;
      if (!r || !l) return;
      // Cut on a natural pause (≥1.5 s spoken) or force a cut every 6 s so words appear while speaking.
      const p = r.pending();
      if ((p >= 1.5 && r.level() < 0.02) || p >= 6) { const f = r.take(); if (f) enqueue(f); }
    }, 250);
    // Screen lock / app switch: send what was said so far right away, keep recording if the phone allows.
    const onHide = () => { if (document.visibilityState === 'hidden') { const f = rec.current?.take(); if (f) enqueue(f); } };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onHide); };
  }, [state]);

  const show = (partial = '') => {
    const l = live.current; if (!l?.textarea || !mounted.current || l.abort.signal.aborted) return;
    const joined = [l.done, partial].filter(Boolean).join(' ');
    setTextarea(l.textarea, l.prefix + joined);
  };
  const enqueue = (file: File) => {
    const l = live.current; if (!l) return;
    l.queue = l.queue.then(async () => {
      if (l.abort.signal.aborted || l.failed) return;
      try {
        const body = new FormData(); body.append('file', file);
        const response = await fetch('/api/transcribe', { method: 'POST', body, signal: l.abort.signal });
        const text = await readTranscript(response, t => show(t.trim()));
        l.done = [l.done, text].filter(Boolean).join(' ');
        show();
      } catch (e) {
        if (l.abort.signal.aborted) return;
        const message = e instanceof Error ? e.message : 'Voice typing failed.';
        if (/samajh nahi aaya/i.test(message)) { show(); return; } // silent / noise-only segment
        l.failed = message;
      }
    });
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error('Is browser mein mic support nahi hai.'); return; }
    setState('starting');
    try {
      const recording = await recordWav();
      if (!mounted.current) { recording.cancel(); return; }
      const textarea = btn.current?.closest('form')?.querySelector('textarea');
      const original = textarea?.value || '';
      const abort = new AbortController(); controller.current = abort;
      live.current = { prefix: original && !/\s$/.test(original) ? original + ' ' : original, done: '', queue: Promise.resolve(), textarea, abort };
      rec.current = recording; setSecs(0); setState('rec');
    } catch (e) {
      if (!mounted.current) return;
      setState('idle');
      toast.error((e as DOMException).name === 'NotAllowedError' ? 'Mic ki permission do (browser address bar mein mic icon).' : 'Mic shuru nahi ho paya.');
    }
  };
  const cancel = () => {
    rec.current?.cancel(); rec.current = null;
    if (live.current?.textarea) setTextarea(live.current.textarea, live.current.prefix.trimEnd());
    controller.current?.abort(); controller.current = null; live.current = null; setState('idle');
  };
  const stop = async () => {
    const recording = rec.current, l = live.current;
    if (!recording || !l) return;
    rec.current = null; setState('busy');
    try {
      const rest = await recording.finish();
      if (rest) enqueue(rest);
      await l.queue;
      if (l.abort.signal.aborted || !mounted.current) return;
      if (l.failed) {
        if (isCreditError(l.failed)) setCreditError(displayAiError(l.failed));
        toast.error(displayAiError(l.failed));
      } else if (!l.done) toast.error('Kuch samajh nahi aaya — dobara bolo.');
      const textarea = l.textarea;
      if (textarea) { textarea.focus(); textarea.setSelectionRange(textarea.value.length, textarea.value.length); }
    } finally {
      if (controller.current === l.abort) { controller.current = null; live.current = null; if (mounted.current) setState('idle'); }
    }
  };
  useEffect(() => { if (state === 'rec' && secs >= 600) void stop(); }, [secs, state]);
  if (creditError) return <Link to="/practice" role="alert" className="grid size-9 shrink-0 place-items-center rounded-full border border-destructive text-destructive" title={`${creditError} · Saved practice`} aria-label="AI credits unavailable — saved practice"><Mic className="size-4" /></Link>;
  if (state === 'rec' || state === 'busy') return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label={state === 'rec' ? 'Recording' : 'Transcribing'}>
      <PromptInputButton ref={btn} onClick={cancel} variant="outline" className="size-9 shrink-0 rounded-full" aria-label="Cancel dictation" tooltip="Cancel dictation"><X className="size-4" /></PromptInputButton>
      {state === 'rec' ? <>
        <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"><span className="size-2 rounded-full bg-destructive" />{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
        <PromptInputButton onClick={stop} variant="secondary" className="size-9 shrink-0 rounded-full" aria-label="Stop and insert text" tooltip="Done — insert text"><Square className="size-3.5 fill-current" /></PromptInputButton>
      </> : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Transcribing" />}
    </div>
  );
  return <PromptInputButton ref={btn} onClick={start} variant="outline" size="sm" className="h-9 w-14 shrink-0 gap-1.5 rounded-full px-2.5" disabled={!hydrated || disabled || state === 'starting'} aria-label="Dictate (voice typing)" tooltip="Bol kar likho">{state === 'starting' ? <Loader2 className="size-4 animate-spin" /> : <><Mic className="size-4" /><AudioLines className="size-3.5" /></>}</PromptInputButton>;
}

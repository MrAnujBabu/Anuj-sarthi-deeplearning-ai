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
  useEffect(() => {
    if (state !== 'rec') return;
    const started = Date.now();
    const timer = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [state]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error('Is browser mein mic support nahi hai.'); return; }
    setState('starting');
    try {
      const recording = await recordWav();
      if (!mounted.current) { recording.cancel(); return; }
      rec.current = recording; setSecs(0); setState('rec');
    } catch (e) {
      if (!mounted.current) return;
      setState('idle');
      toast.error((e as DOMException).name === 'NotAllowedError' ? 'Mic ki permission do (browser address bar mein mic icon).' : 'Mic shuru nahi ho paya.');
    }
  };
  const cancel = () => {
    rec.current?.cancel(); rec.current = null;
    controller.current?.abort(); controller.current = null; setState('idle');
  };
  const stop = async () => {
    const recording = rec.current;
    if (!recording) return;
    rec.current = null;
    const textarea = btn.current?.closest('form')?.querySelector('textarea');
    const original = textarea?.value || '';
    const prefix = original && !/\s$/.test(original) ? original + ' ' : original;
    const abort = new AbortController(); controller.current = abort; setState('busy');
    try {
      const file = await recording.stop();
      const body = new FormData(); body.append('file', file);
      const response = await fetch('/api/transcribe', { method: 'POST', body, signal: abort.signal });
      await readTranscript(response, text => {
        if (textarea && mounted.current && !abort.signal.aborted) setTextarea(textarea, prefix + text);
      });
      if (textarea && mounted.current) { textarea.focus(); textarea.setSelectionRange(textarea.value.length, textarea.value.length); }
    } catch (e) {
      if (abort.signal.aborted || !mounted.current) return;
      const message = e instanceof Error ? e.message : 'Voice typing failed.';
      if (isCreditError(message)) setCreditError(displayAiError(message));
      toast.error(displayAiError(message));
    } finally {
      if (controller.current === abort) { controller.current = null; if (mounted.current) setState('idle'); }
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

import { Loader2, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useHydrated } from '@tanstack/react-router';
import { toast } from 'sonner';
import { recordWav, type Recording } from '@/lib/record-wav';
import { readTranscript } from '@/lib/transcription';
import { displayAiError } from '@/lib/ai/errors';

/** Round mic inside a Studio field: tap to speak, tap again to insert the text. */
export function FieldMic({ value, onText, disabled, maxLength }: { value: string; onText: (text: string) => void; disabled?: boolean; maxLength?: number }) {
  const hydrated = useHydrated();
  const [state, setState] = useState<'idle' | 'starting' | 'rec' | 'busy'>('idle');
  const rec = useRef<Recording | null>(null);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; rec.current?.cancel(); abort.current?.abort(); }; }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error('Is browser mein mic support nahi hai.'); return; }
    setState('starting');
    try {
      const r = await recordWav();
      if (!mounted.current) { r.cancel(); return; }
      rec.current = r; setState('rec');
    } catch (e) {
      if (!mounted.current) return;
      setState('idle');
      toast.error((e as DOMException).name === 'NotAllowedError' ? 'Mic ki permission do (browser address bar mein mic icon).' : 'Mic shuru nahi ho paya.');
    }
  };
  const stop = async () => {
    const r = rec.current; if (!r) return; rec.current = null;
    const prefix = value && !/\s$/.test(value) ? value + ' ' : value;
    const ctrl = new AbortController(); abort.current = ctrl; setState('busy');
    try {
      const body = new FormData(); body.append('file', await r.stop());
      const res = await fetch('/api/transcribe', { method: 'POST', body, signal: ctrl.signal });
      await readTranscript(res, text => { if (mounted.current && !ctrl.signal.aborted) onText((prefix + text).slice(0, maxLength)); });
    } catch (e) {
      if (!ctrl.signal.aborted && mounted.current) toast.error(displayAiError(e instanceof Error ? e.message : 'Voice typing failed.'));
    } finally {
      if (abort.current === ctrl) { abort.current = null; if (mounted.current) setState('idle'); }
    }
  };

  const rec_ = state === 'rec';
  return (
    <button
      type="button"
      onClick={rec_ ? stop : start}
      disabled={!hydrated || disabled || state === 'starting' || state === 'busy'}
      aria-label={rec_ ? 'Stop and insert text' : 'Bol kar likho'}
      title={rec_ ? 'Done — text daalo' : 'Bol kar likho'}
      className={`absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border shadow-sm transition-colors disabled:opacity-50 ${rec_ ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}
    >
      {state === 'starting' || state === 'busy' ? <Loader2 className="size-4 animate-spin" /> : rec_ ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
    </button>
  );
}

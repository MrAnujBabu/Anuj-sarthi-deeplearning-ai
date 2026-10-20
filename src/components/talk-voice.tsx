import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordWav, type Recording } from "@/lib/record-wav";
import { readTranscript } from "@/lib/transcription";
import { streamSpeech } from "@/lib/stream-speech";
import { displayAiError, isCreditError } from "@/lib/ai/errors";
import { readTutorAnswer, speakableText, toUIMessages, type TalkMessage } from "@/lib/talk-turn";

type Phase = 'idle' | 'listening' | 'hearing' | 'thinking' | 'speaking';
const LABEL: Record<Phase, string> = {
  idle: 'Mic dabao aur apna sawal bolo',
  listening: 'Sun raha hoon… bolkar khatam ho to dabao',
  hearing: 'Samajh raha hoon…',
  thinking: 'Jawab soch raha hoon…',
  speaking: 'Bol raha hoon…',
};

export function TalkVoice() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [error, setError] = useState('');
  const rec = useRef<Recording | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => { rec.current?.cancel(); abort.current?.abort(); }, []);

  const stopAll = () => { rec.current?.cancel(); rec.current = null; abort.current?.abort(); abort.current = null; setPhase('idle'); };

  const startListening = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Is browser mein mic support nahi hai.'); return; }
    try { rec.current = await recordWav(); setPhase('listening'); }
    catch (e) { setError((e as DOMException).name === 'NotAllowedError' ? 'Mic ki permission do (address bar mein mic icon).' : 'Mic shuru nahi ho paya.'); }
  };

  const finishTurn = async () => {
    const recording = rec.current; if (!recording) return;
    rec.current = null;
    const ctrl = new AbortController(); abort.current = ctrl;
    try {
      setPhase('hearing');
      const body = new FormData(); body.append('file', await recording.stop());
      const question = await readTranscript(await fetch('/api/transcribe', { method: 'POST', body, signal: ctrl.signal }), () => {});
      const user: TalkMessage = { id: crypto.randomUUID(), role: 'user', text: question };
      const answerId = crypto.randomUUID();
      const history = [...messages, user];
      setMessages([...history, { id: answerId, role: 'assistant', text: '' }]);
      setPhase('thinking');
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal, body: JSON.stringify({ messages: toUIMessages(history), mode: 'doubt' }) });
      const answer = await readTutorAnswer(response, text => setMessages(m => m.map(x => x.id === answerId ? { ...x, text } : x)));
      if (ctrl.signal.aborted) return;
      setPhase('speaking');
      await streamSpeech('/api/speech', speakableText(answer), ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const message = e instanceof Error ? e.message : 'Kuch gadbad ho gayi.';
      setError(isCreditError(message) ? `${displayAiError(message)} Saved practice abhi bhi chalegi.` : displayAiError(message));
    } finally {
      if (abort.current === ctrl) { abort.current = null; setPhase('idle'); }
    }
  };

  const busy = phase === 'hearing' || phase === 'thinking' || phase === 'speaking';
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header className="flex items-center gap-3 border-b py-4">
        <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft className="size-5" /></Link></Button>
        <div><h1 className="text-xl font-semibold">Voice mode</h1><p className="text-sm text-muted-foreground">Bolo, phir jawab suno</p></div>
      </header>
      <section className="flex-1 space-y-3 overflow-y-auto py-6" aria-live="polite">
        {messages.length === 0 && <p className="text-center text-muted-foreground">Apna NEET doubt bolkar poochho — jawab likha bhi aayega aur sunai bhi dega.</p>}
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground' : 'max-w-[90%] rounded-2xl bg-muted px-4 py-2 whitespace-pre-wrap'}>
            {m.text || <Loader2 className="size-4 animate-spin" />}
          </div>
        ))}
      </section>
      {error && <div role="alert" className="mb-3 rounded-xl border border-destructive px-4 py-3 text-destructive">{error} {/credit/i.test(error) && <Link to="/practice" className="underline">Saved practice</Link>}</div>}
      <footer className="flex flex-col items-center gap-3 border-t py-5">
        <p className="text-sm text-muted-foreground">{LABEL[phase]}</p>
        <div className="flex items-center gap-3">
          {phase === 'listening' ? (
            <Button size="lg" className="h-16 w-16 rounded-full" onClick={finishTurn} aria-label="Bolna khatam"><Square className="size-6 fill-current" /></Button>
          ) : (
            <Button size="lg" className="h-16 w-16 rounded-full" onClick={startListening} disabled={busy} aria-label="Bolna shuru karo">{busy ? (phase === 'speaking' ? <Volume2 className="size-6" /> : <Loader2 className="size-6 animate-spin" />) : <Mic className="size-6" />}</Button>
          )}
          {busy && <Button variant="outline" onClick={stopAll}>Roko</Button>}
        </div>
      </footer>
    </main>
  );
}

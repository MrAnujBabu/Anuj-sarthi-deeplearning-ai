import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchHindiSpeech } from '@/lib/youtube-speech';
import { readDubAudio } from '@/lib/youtube-audio';
import { encodeWav } from '@/lib/record-wav';
import { SPEECH_SAMPLE_RATE } from '@/lib/stream-speech';
import { narrationWav, deliverNarration } from '@/lib/youtube-download';
import { splitForSpeech } from '@/lib/youtube-hindi';
import type { SarvamVoice } from '@/lib/sarvam-speech';

export function YouTubeNarrationDownload({ text, voice, videoId, disabled, onBusyChange }: {
  text: string; voice: SarvamVoice; videoId: string | null | undefined; disabled: boolean; onBusyChange(value: boolean): void;
}) {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null), [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  useEffect(() => { setAudio(null); setError(''); setProgress(''); }, [text, voice]);
  useEffect(() => () => operation.current?.abort(), []);

  async function prepare() {
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); onBusyChange(true); setError(''); setAudio(null);
    const context = new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE });
    try {
      const pieces = splitForSpeech(text), parts: Blob[] = [];
      for (let i = 0; i < pieces.length; i++) {
        controller.signal.throwIfAborted();
        setProgress(`Audio तैयार हो रही है · ${i + 1}/${pieces.length}`);
        const response = await fetchHindiSpeech(pieces[i] ?? '', voice, controller.signal);
        const buffer = await readDubAudio(response, context, controller.signal);
        parts.push(encodeWav([buffer.getChannelData(0)], SPEECH_SAMPLE_RATE).slice(44));
      }
      const blob = await narrationWav(parts); controller.signal.throwIfAborted();
      setAudio(blob); setProgress(`${(blob.size / 1048576).toFixed(1)} MB · WAV`);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Audio तैयार नहीं हुई।');
      setProgress('');
    } finally {
      await context.close().catch(() => {});
      if (operation.current === controller) { operation.current = null; setBusy(false); onBusyChange(false); }
    }
  }

  return <div className="mt-5 space-y-2 border-t pt-4">
    <div className="flex flex-wrap items-center gap-3">
      {busy ? <>
        <Loader2 className="size-4 animate-spin text-primary" />
        <Button size="icon" variant="outline" aria-label="Cancel audio download preparation" title="Cancel" onClick={() => operation.current?.abort()}><Square className="size-4" /></Button>
      </> : audio ? <Button variant="outline" disabled={disabled} onClick={() => void deliverNarration(audio, `snapsolve-hindi-${videoId ?? 'transcript'}.wav`).catch(() => setError('Audio save नहीं हुई। दोबारा कोशिश करें।'))}><Download className="size-4" />Download Hindi audio</Button>
        : <Button variant="outline" disabled={disabled || !text.trim()} onClick={() => void prepare()}><Download className="size-4" />Download के लिए audio बनाओ</Button>}
      <span role="status" className="text-xs text-muted-foreground">{progress}</span>
      {!audio && !busy && <span className="text-xs text-muted-foreground">Voice generation credits लागू</span>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
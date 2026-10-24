import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import originalTeacher from '@/assets/indian-teacher-voice-sample.wav.asset.json';
import originalPolished from '@/assets/indian-teacher-polished.wav.asset.json';
import originalScene from '@/assets/mithali-scene-1h34m00s-1h34m38s-2.wav.asset.json';
import kore from '@/assets/teacher-sample-kore.wav.asset.json';
import aoede from '@/assets/teacher-sample-aoede.wav.asset.json';
import leda from '@/assets/teacher-sample-leda.wav.asset.json';

const originals = [
  { id: 'original-teacher', name: 'Indian teacher', url: originalTeacher.url },
  { id: 'original-polished', name: 'Indian teacher · polished', url: originalPolished.url },
  { id: 'original-scene', name: 'Mithali · scene', url: originalScene.url },
];
const alternatives = [
  { id: 'kore', name: 'Kore', url: kore.url },
  { id: 'aoede', name: 'Aoede', url: aoede.url },
  { id: 'leda', name: 'Leda', url: leda.url },
];

/** Saved recordings only; never assigns a sample's identity to the live tutor. */
export function VoiceSamples({ disabled = false, sampleId }: { disabled?: boolean; sampleId?: string }) {
  const [group, setGroup] = useState<'original' | 'alternative'>(sampleId ? 'alternative' : 'original');
  const [playing, setPlaying] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const revision = useRef(0);
  const stop = () => {
    revision.current += 1;
    if (audio.current && !audio.current.paused) audio.current.pause();
    setPlaying(null); setPaused(false); setLoading(false); setElapsed(0); setDuration(0);
  };
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  useEffect(() => () => { revision.current += 1; if (audio.current && !audio.current.paused) audio.current.pause(); }, []);
  const play = async (sample: (typeof originals)[number], replay = false) => {
    if (disabled) return;
    const player = audio.current;
    if (!player) return;
    if (playing === sample.id && !paused && !replay) {
      revision.current += 1;
      player.pause(); setPaused(true); setLoading(false);
      return;
    }
    const same = playing === sample.id;
    if (!same) {
      stop(); player.src = sample.url;
    }
    if (replay || !same || player.ended) { player.currentTime = 0; setElapsed(0); }
    setError(''); setPaused(false);
    const current = revision.current;
    setPlaying(sample.id); setLoading(true);
    try {
      await player.play();
      if (revision.current === current) setLoading(false);
    } catch {
      if (revision.current === current) { stop(); setError('Sample nahi chala. Dobara Play dabao.'); }
    }
  };
  return <section className="space-y-3 text-left" aria-label="Voice samples">
    <h2 className="text-sm font-semibold">Voice samples</h2>
    {!sampleId && <div className="flex gap-1 border-b pb-2">
      <Button size="sm" variant={group === 'original' ? 'secondary' : 'ghost'} aria-pressed={group === 'original'} onClick={() => { stop(); setGroup('original'); }}>Uploaded originals</Button>
      <Button size="sm" variant={group === 'alternative' ? 'secondary' : 'ghost'} aria-pressed={group === 'alternative'} onClick={() => { stop(); setGroup('alternative'); }}>AI alternatives</Button>
    </div>}
    <p className="text-xs text-muted-foreground">{group === 'original' ? 'Original recordings · live tutor clone available nahi hai.' : 'Gemini Hindi/Hinglish samples · live-call awaaz se alag, exact clone nahi.'}</p>
    <div className="divide-y divide-border">
      {(group === 'original' ? originals : alternatives).filter(sample => !sampleId || sample.id === sampleId).map(sample => <div key={sample.id} className="flex min-h-12 items-center gap-2 py-1">
        <span className="min-w-0 flex-1 break-words text-sm">{sample.name}</span>
        <Button size="icon" variant="outline" className="size-10 shrink-0" disabled={disabled} aria-label={`${playing === sample.id && !paused ? 'Pause' : 'Play'} ${sample.name} sample`} title={`${playing === sample.id && !paused ? 'Pause' : 'Play'} ${sample.name}`} onClick={() => void play(sample)}>{playing === sample.id && !paused ? <Pause className="size-4" /> : <Play className="size-4" />}</Button>
        <Button size="icon" variant="ghost" className="size-10 shrink-0" disabled={disabled} aria-label={`Replay ${sample.name} sample`} title={`Replay ${sample.name}`} onClick={() => void play(sample, true)}><RotateCcw className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-10 shrink-0" asChild><a href={sample.url} download={`${sample.id}.wav`} aria-label={`Download ${sample.name} sample`} title={`Download ${sample.name}`}><Download className="size-4" /></a></Button>
      </div>)}
    </div>
    {playing && <p role="status" className="text-xs tabular-nums text-muted-foreground">{paused ? 'Paused' : 'Playing'} · {Math.floor(elapsed)} / {Math.floor(duration)} s</p>}
    {loading && <p role="status" className="text-xs text-muted-foreground">Sample load ho raha hai…</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <audio ref={audio} aria-label="Sample audio" preload="none" onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onEnded={() => { setPaused(true); setLoading(false); }} onError={() => { stop(); setError('Sample audio load nahi hua.'); }} />
  </section>;
}
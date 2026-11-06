import { useEffect, useState } from 'react';
import { Clapperboard, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ANIMATION_ASPECTS, ANIMATION_DURATIONS, DETAILS_MAX, TOPIC_MAX, animationCost, formatCredits,
  type AnimationAspect, type AnimationDuration, type AnimationResolution, type StudioJob,
} from '@/lib/studio-tools';
import { saveStudioItem } from '@/lib/studio-store';
import { Choice, CostNote, FieldLabel, ToolError, ToolPanel, postJson } from './studio-shared';

const DURATIONS = ANIMATION_DURATIONS.map(d => ({ value: d, label: `${d} sec` }));
const QUALITIES = [{ value: '480p', label: '480p' }, { value: '720p', label: '720p HD' }] as const;
const ASPECTS = ANIMATION_ASPECTS.map(a => ({ value: a, label: a === '16:9' ? '16:9 wide' : a === '9:16' ? '9:16 phone' : '1:1 square' }));

export function AnimationTool({ initialTopic = '' }: { initialTopic?: string }) {
  const [topic, setTopic] = useState(initialTopic);
  const [details, setDetails] = useState('');
  const [duration, setDuration] = useState<AnimationDuration>(5);
  const [resolution, setResolution] = useState<AnimationResolution>('480p');
  const [aspect, setAspect] = useState<AnimationAspect>('16:9');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (initialTopic) setTopic(initialTopic); }, [initialTopic]);
  const cost = animationCost(duration, resolution);

  async function start() {
    const t = topic.trim();
    if (t.length < 2) { toast.error('Pehle topic likhiye.'); return; }
    if (!window.confirm(`Is animation ka kharcha ≈ ${formatCredits(cost)} hai. Shuru karein?`)) return;
    setBusy(true);
    setError(null);
    try {
      const { job } = await postJson<{ job: StudioJob }>('/api/studio-video', { tool: 'animation', topic: t, details, duration, resolution, aspect });
      await saveStudioItem({
        id: crypto.randomUUID(), tool: 'animation', title: t, createdAt: Date.now(), status: job.status, progress: job.progress,
        jobId: job.id, expiresAt: job.expiresAt, credits: job.billedCredits ?? cost, error: job.error,
        detail: `${duration} sec · ${resolution} · ${aspect}`,
      });
      toast.success('Animation ban rahi hai — 1–3 minute. Neeche gallery mein dikhegi.');
      setTopic('');
      setDetails('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Animation shuru nahi ho paayi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolPanel id="animation" icon={<Clapperboard className="size-5" />}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void start(); }}>
        <div>
          <FieldLabel htmlFor="studio-anim-topic">Kya dikhana hai?</FieldLabel>
          <Input id="studio-anim-topic" value={topic} maxLength={TOPIC_MAX} disabled={busy} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Blood flow through the human heart" />
        </div>
        <div>
          <FieldLabel htmlFor="studio-anim-details" hint="(optional)">Kaunse steps dikhne chahiye</FieldLabel>
          <Textarea id="studio-anim-details" value={details} maxLength={DETAILS_MAX} disabled={busy} rows={2} onChange={e => setDetails(e.target.value)}
            placeholder="e.g. deoxygenated blood right atrium se right ventricle, phir lungs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><FieldLabel>Length</FieldLabel><Choice label="Length" value={duration} options={DURATIONS} onChange={setDuration} disabled={busy} /></div>
          <div><FieldLabel>Quality</FieldLabel><Choice label="Quality" value={resolution} options={QUALITIES} onChange={setResolution} disabled={busy} /></div>
          <div><FieldLabel>Shape</FieldLabel><Choice label="Shape" value={aspect} options={ASPECTS} onChange={setAspect} disabled={busy} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CostNote>≈ {formatCredits(cost)} · bina awaaz, bina text · 1–3 minute</CostNote>
          <Button type="submit" className="touch-btn" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Animation banao</Button>
        </div>
      </form>
      <ToolError message={error} />
    </ToolPanel>
  );
}

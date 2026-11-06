import { useEffect, useRef, useState } from 'react';
import { Download, ImageIcon, Loader2, Square, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { DETAILS_MAX, SEEDREAM_IMAGE_CREDITS, TOPIC_MAX, formatCredits, type ImageOrientation, type ImageStyle } from '@/lib/studio-tools';
import { saveStudioItem } from '@/lib/studio-store';
import { Choice, CostNote, FieldLabel, ToolError, ToolPanel, downloadDataUrl, postJson, slug } from './studio-shared';

const STYLES = [{ value: 'diagram', label: 'Labelled diagram' }, { value: 'poster', label: 'Revision poster' }] as const;
const SIZES = [{ value: 'portrait', label: 'Portrait 3:4' }, { value: 'square', label: 'Square' }, { value: 'landscape', label: 'Landscape 4:3' }] as const;

export function ImageTool({ initialTopic = '' }: { initialTopic?: string }) {
  const [style, setStyle] = useState<ImageStyle>('diagram');
  const [orientation, setOrientation] = useState<ImageOrientation>('portrait');
  const [topic, setTopic] = useState(initialTopic);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ image: string; topic: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { if (initialTopic) setTopic(initialTopic); }, [initialTopic]);
  useEffect(() => () => abort.current?.abort(), []);

  async function create() {
    const t = topic.trim();
    if (t.length < 2) { toast.error('Pehle topic likhiye.'); return; }
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { image } = await postJson<{ image: string }>('/api/studio-image', { style, topic: t, details, orientation }, ctrl.signal);
      setResult({ image, topic: t });
      await saveStudioItem({
        id: crypto.randomUUID(), tool: 'diagram', title: t, createdAt: Date.now(), status: 'completed', progress: 100,
        image, credits: SEEDREAM_IMAGE_CREDITS, detail: style === 'diagram' ? 'Labelled diagram' : 'Revision poster',
      }).catch(() => toast.error('Image bani, par is device par save nahi ho paayi — abhi download kar lijiye.'));
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Image nahi ban paayi.');
    } finally {
      if (abort.current === ctrl) abort.current = null;
      setBusy(false);
    }
  }

  return (
    <ToolPanel id="diagram" icon={<ImageIcon className="size-5" />}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void create(); }}>
        <Choice label="Image type" value={style} options={STYLES} onChange={setStyle} disabled={busy} />
        <div>
          <FieldLabel htmlFor="studio-image-topic">Topic</FieldLabel>
          <Input id="studio-image-topic" value={topic} maxLength={TOPIC_MAX} disabled={busy} onChange={e => setTopic(e.target.value)}
            placeholder={style === 'diagram' ? 'e.g. Human heart — L.S. view' : 'e.g. Photosynthesis — light reaction'} />
        </div>
        <div>
          <FieldLabel htmlFor="studio-image-details" hint="(optional)">{style === 'diagram' ? 'Zaroori labels' : 'Zaroori points'}</FieldLabel>
          <Textarea id="studio-image-details" value={details} maxLength={DETAILS_MAX} disabled={busy} rows={2} onChange={e => setDetails(e.target.value)}
            placeholder={style === 'diagram' ? 'e.g. right atrium, SA node, bicuspid valve, aorta' : 'e.g. Z-scheme, photolysis of water, NADPH, ATP'} />
        </div>
        <Choice label="Image size" value={orientation} options={SIZES} onChange={setOrientation} disabled={busy} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CostNote>≈ {formatCredits(SEEDREAM_IMAGE_CREDITS)} per image · 20–60 second</CostNote>
          {busy ? (
            <Button type="button" variant="outline" className="touch-btn" onClick={() => abort.current?.abort()}><Square className="size-4" />Stop</Button>
          ) : (
            <Button type="submit" className="touch-btn"><Wand2 className="size-4" />Image banao</Button>
          )}
        </div>
      </form>
      <ToolError message={error} />
      {busy && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /><Shimmer>ByteDance Seedream image bana raha hai…</Shimmer>
        </div>
      )}
      {result && !busy && (
        <figure className="mt-4 overflow-hidden rounded-xl border bg-background">
          <img src={result.image} alt={`${result.topic} — AI image`} className="mx-auto max-h-[70vh] w-full object-contain" />
          <figcaption className="flex items-center justify-between gap-2 border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">{result.topic} · Gallery mein saved</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => downloadDataUrl(result.image, `${slug(result.topic)}.png`)}><Download className="size-3.5" />Save</Button>
          </figcaption>
        </figure>
      )}
      <p className="mt-3 text-xs text-muted-foreground">AI image hai — labels ko NCERT figure se ek baar milaa lijiye.</p>
    </ToolPanel>
  );
}

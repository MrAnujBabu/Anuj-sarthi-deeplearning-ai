import { useEffect, useRef, useState } from 'react';
import { FileVideo, Loader2, Sparkles, Timer, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  ENHANCE_MAX_BYTES, ENHANCE_MAX_SECONDS, clipFrames, containerFromName, probeIsoVideo,
  type EnhanceTarget, type StudioJob, type VideoProbe,
} from '@/lib/studio-tools';
import { saveStudioItem } from '@/lib/studio-store';
import { useStudioRecovery } from '@/lib/studio-recovery';
import { Choice, CostNote, FieldLabel, ToolError, ToolPanel, postJson, StudioRequestError } from './studio-shared';

const TARGETS = [{ value: '1080p', label: '1080p Full HD' }, { value: '4k', label: '4K' }] as const;
type Stage = 'idle' | 'reading' | 'uploading' | 'starting';

export function EnhanceTool() {
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(10);
  const [target, setTarget] = useState<EnhanceTarget>('1080p');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { blocked } = useStudioRecovery();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function reset() {
    setFile(null); setProbe(null); setPreview(null); setStart(0); setLength(10);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    const container = containerFromName(f.name);
    if (!container) { toast.error('MP4, MOV ya M4V video chuniye.'); return; }
    if (f.size > ENHANCE_MAX_BYTES) { toast.error('Video 50 MB se chhoti honi chahiye — pehle trim kar lijiye.'); return; }
    setStage('reading');
    try {
      const info = probeIsoVideo(await f.arrayBuffer(), container);
      if (!info) { toast.error('Is video ki jaankari padh nahi paaye. Phone camera wali MP4 try kariye.'); return; }
      setFile(f);
      setProbe(info);
      setPreview(URL.createObjectURL(f));
      setStart(0);
      setLength(Math.min(ENHANCE_MAX_SECONDS, Math.max(1, Math.floor(info.durationSeconds))));
    } finally {
      setStage('idle');
    }
  }

  const clip = probe ? clipFrames(probe, start, length) : null;

  async function enhance() {
    if (!file || !probe || !clip) return;
    if (!window.confirm(`${clip.seconds.toFixed(1)} second ka clip Topaz se ${target === '4k' ? '4K' : '1080p'} mein saaf hoga. Credits clip ki lambai ke hisaab se lagenge. Shuru karein?`)) return;
    let path: string | null = null;
    let uploaded = false;
    setError(null);
    try {
      setStage('uploading');
      const slot = await postJson<{ path: string; token: string }>('/api/studio-upload', { container: probe.container, size: file.size });
      path = slot.path;
      const { error } = await supabase.storage.from('studio-temp').uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || 'video/mp4' });
      if (error) throw new Error('Video upload nahi ho paayi — internet check karke phir try kariye.');
      uploaded = true;
      setStage('starting');
      const { job } = await postJson<{ job: StudioJob }>('/api/studio-video', {
        tool: 'enhance', path: slot.path, container: probe.container, width: probe.width, height: probe.height,
        frameCount: probe.frameCount, frameRate: probe.frameRate, startIndex: clip.start_index, endIndex: clip.end_index, target,
      });
      await saveStudioItem({
        id: crypto.randomUUID(), tool: 'enhance', title: file.name, createdAt: Date.now(), status: job.status, progress: job.progress,
        jobId: job.id, expiresAt: job.expiresAt, credits: job.billedCredits, error: job.error, uploadPath: slot.path,
        detail: `${probe.width}×${probe.height} → ${target === '4k' ? '4K' : '1080p'} · ${clip.seconds.toFixed(1)} sec`,
      }).catch(() => toast.error(`Video ka kaam shuru ho gaya (job: ${job.id}), par device par save nahi hua. Gallery khuli rakhiye; dobara submit mat kariye.`));
      toast.success('Topaz video saaf kar raha hai — kuch minute lagenge. Gallery mein progress dikhega.');
      reset();
    } catch (e) {
      // A lost response may hide an accepted paid job: never remove its source.
      if (path && (!uploaded || (e instanceof StudioRequestError && [400, 401, 402, 403, 429].includes(e.status)))) {
        void fetch(`/api/studio-upload?path=${encodeURIComponent(path)}`, { method: 'DELETE' }).catch(() => {});
      }
      setError(e instanceof Error ? e.message : 'Video saaf karna shuru nahi ho paaya.');
    } finally {
      setStage('idle');
    }
  }

  const busy = stage !== 'idle';
  return (
    <ToolPanel id="enhance" icon={<Sparkles className="size-5" />}>
      {!file || !probe ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
          <FileVideo className="mx-auto size-8 text-primary" />
          <p className="mt-2 text-sm">Dhundhli class / board ki recording chuniye</p>
          <p className="text-xs text-muted-foreground">MP4 · MOV · M4V · 50 MB tak · ek baar mein {ENHANCE_MAX_SECONDS} second tak ka hissa</p>
          <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,.mp4,.mov,.m4v" className="sr-only" id="studio-enhance-file"
            onChange={e => void pick(e.target.files?.[0])} disabled={busy} />
          <Button asChild variant="outline" className="touch-btn mt-3" disabled={busy}>
            <label htmlFor="studio-enhance-file" className="cursor-pointer">{stage === 'reading' ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Video chuniye</label>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-background">
            {preview && <video ref={videoRef} src={preview} controls playsInline className="max-h-72 w-full bg-muted" />}
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{file.name} · {probe.width}×{probe.height} · {probe.frameRate.toFixed(probe.frameRate % 1 ? 2 : 0)} fps · {probe.durationSeconds.toFixed(1)} sec</span>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Video hatao" onClick={reset} disabled={busy}><X className="size-4" /></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="studio-enhance-start" hint="(second)">Kahan se</FieldLabel>
              <div className="flex gap-2">
                <Input id="studio-enhance-start" type="number" inputMode="decimal" min={0} max={Math.max(0, probe.durationSeconds - 0.1)} step={0.5}
                  value={start} disabled={busy} onChange={e => setStart(Math.max(0, Math.min(Number(e.target.value) || 0, probe.durationSeconds)))} />
                <Button type="button" variant="outline" className="shrink-0" disabled={busy} onClick={() => setStart(Math.round((videoRef.current?.currentTime ?? 0) * 10) / 10)}><Timer className="size-4" />Abhi</Button>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="studio-enhance-length" hint={`(max ${ENHANCE_MAX_SECONDS} sec)`}>Kitna lamba</FieldLabel>
              <Input id="studio-enhance-length" type="number" inputMode="decimal" min={1} max={ENHANCE_MAX_SECONDS} step={1}
                value={length} disabled={busy} onChange={e => setLength(Math.max(1, Math.min(Number(e.target.value) || 1, ENHANCE_MAX_SECONDS)))} />
            </div>
          </div>
          <div><FieldLabel>Kitna saaf</FieldLabel><Choice label="Target quality" value={target} options={TARGETS} onChange={setTarget} disabled={busy} /></div>
          {clip && <p className="text-xs text-muted-foreground">Clip: {(clip.start_index / probe.frameRate).toFixed(1)}s → {((clip.end_index + 1) / probe.frameRate).toFixed(1)}s · {clip.frames} frames</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CostNote>Topaz clip ki lambai ke hisaab se charge karta hai · asli credits job ke baad gallery mein</CostNote>
            <Button type="button" className="touch-btn" onClick={() => void enhance()} disabled={busy || blocked}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {stage === 'uploading' ? 'Upload ho raha hai…' : stage === 'starting' ? 'Shuru ho raha hai…' : 'Video saaf karo'}
            </Button>
          </div>
          <ToolError message={error} />
          <p className="text-xs text-muted-foreground">Aapki video sirf is kaam ke liye kuch der server par rehti hai, job khatam hote hi hata di jaati hai.</p>
        </div>
      )}
    </ToolPanel>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clapperboard, Clock, Download, ImageIcon, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { STUDIO_TOOLS, formatCredits, type StudioJob, type StudioToolId } from '@/lib/studio-tools';
import { STUDIO_EVENT, deleteStudioItem, isPendingItem, listStudioItems, patchStudioItem, type StudioItem } from '@/lib/studio-store';
import { downloadBlob, downloadDataUrl, slug } from './studio-shared';
import { deferStudio, responseWaitSeconds, studioRemaining } from '@/lib/studio-recovery';
import { TelegramSave } from './telegram-save';

const ICONS: Record<StudioToolId, typeof ImageIcon> = { diagram: ImageIcon, animation: Clapperboard, enhance: Sparkles };

function useStudioItems() {
  const [items, setItems] = useState<StudioItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => { listStudioItems().then(list => { if (alive) setItems(list); }, () => { if (alive) setItems([]); }); };
    refresh();
    window.addEventListener(STUDIO_EVENT, refresh);
    return () => { alive = false; window.removeEventListener(STUDIO_EVENT, refresh); };
  }, []);
  return items;
}

/** Polls unfinished video jobs every few seconds while the page is open; saves animations on finish. */
function usePollJobs(items: StudioItem[] | null) {
  const pending = useMemo(() => (items ?? []).filter(isPendingItem), [items]);
  const key = pending.map(i => i.id).join(',');
  const failures = useRef(0);
  useEffect(() => {
    if (!pending.length) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (studioRemaining()) {
        timer = setTimeout(tick, studioRemaining() * 1000);
        return;
      }
      if (document.visibilityState === 'visible') {
        for (const item of pending) {
          if (stopped) return;
          try {
            const res = await fetch(`/api/studio-video?id=${encodeURIComponent(item.jobId ?? '')}`);
            const body = await res.json().catch(() => ({})) as { job?: StudioJob; error?: string };
            if (res.status === 429) { deferStudio(responseWaitSeconds(res)); break; }
            if (res.status === 404) { await finish(item, { status: 'failed', error: 'Job nahi mila — shayad time khatam ho gaya.' }); continue; }
            if (!res.ok || !body.job) throw new Error(body.error || `Status ${res.status}`);
            failures.current = 0;
            const job = body.job;
            if (job.status === 'completed' || job.status === 'failed') await finish(item, { ...job, status: job.status });
            else await patchStudioItem(item.id, { status: job.status, progress: job.progress, expiresAt: job.expiresAt });
          } catch {
            failures.current += 1;
          }
        }
      }
      if (!stopped) timer = setTimeout(tick, Math.min(30_000, 5_000 * 2 ** Math.min(failures.current, 3)));
    };
    timer = setTimeout(tick, 1500);
    return () => { stopped = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

async function finish(item: StudioItem, job: Partial<StudioJob> & { status: 'completed' | 'failed' }) {
  let cleaned = false;
  if (item.uploadPath) {
    try { cleaned = (await fetch(`/api/studio-upload?path=${encodeURIComponent(item.uploadPath)}`, { method: 'DELETE' })).ok; } catch { /* Preserve cleanup pointer on failure. */ }
  }
  const base: Partial<StudioItem> = {
    status: job.status, progress: job.status === 'completed' ? 100 : item.progress, error: job.error ?? (job.status === 'failed' ? 'Video nahi ban paayi.' : null),
    expiresAt: job.expiresAt ?? item.expiresAt ?? null, credits: job.billedCredits ?? item.credits ?? null,
  };
  if (cleaned) base.uploadPath = undefined;
  await patchStudioItem(item.id, base);
  if (job.status === 'completed') toast.success(`${STUDIO_TOOLS[item.tool].label} taiyaar: ${item.title}`);
  else toast.error(`${item.title}: ${base.error}`);
}

function hoursLeft(expiresAt: number | null | undefined) {
  if (!expiresAt) return null;
  const h = (expiresAt - Date.now()) / 3_600_000;
  return h;
}

function VideoBlob({ blob, label }: { blob: Blob; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [blob]);
  return url ? <video src={url} controls playsInline loop className="w-full bg-muted" aria-label={label} /> : null;
}

function ItemCard({ item }: { item: StudioItem }) {
  const Icon = ICONS[item.tool];
  const pending = item.status === 'queued' || item.status === 'in_progress';
  const left = hoursLeft(item.expiresAt);
  const remoteAvailable = item.status === 'completed' && !!item.jobId && (left === null || left > 0);
  const savedCopy = item.imagePath && Date.now() - item.createdAt < 24 * 60 * 60 * 1000 ? `/api/studio-image?path=${encodeURIComponent(item.imagePath)}` : undefined;
  const remove = () => { if (window.confirm(`"${item.title}" hatayein?`)) void deleteStudioItem(item.id); };
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      {item.tool === 'diagram' && (item.image || item.telegramRef || savedCopy) && <img src={item.telegramRef ? `/api/studio-telegram?ref=${encodeURIComponent(item.telegramRef)}` : item.image ?? savedCopy} alt={`${item.title} — AI image`} loading="lazy" className="max-h-80 w-full bg-background object-contain" />}
      {item.tool !== 'diagram' && item.telegramRef && <video src={`/api/studio-telegram?ref=${encodeURIComponent(item.telegramRef)}`} controls playsInline className="w-full bg-muted" aria-label={item.title} />}
      {item.video && <VideoBlob blob={item.video} label={item.title} />}
      {!item.telegramRef && !item.video && item.tool !== 'diagram' && remoteAvailable && (
        <video src={`/api/studio-video-file?id=${encodeURIComponent(item.jobId ?? '')}`} controls playsInline preload="metadata" className="w-full bg-muted" aria-label={item.title} />
      )}
      {pending && (
        <div className="space-y-2 border-b bg-muted/30 px-3 py-4">
          <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin text-primary" />{item.status === 'queued' ? 'Line mein hai…' : `Ban raha hai… ${Math.round(item.progress)}%`}</div>
          <Progress value={item.status === 'queued' ? 3 : Math.max(5, item.progress)} aria-label={`${item.title} progress`} />
        </div>
      )}
      {item.status === 'failed' && (
        <p className="flex items-start gap-2 border-b bg-destructive/5 px-3 py-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{item.error || 'Nahi ban paaya.'}</p>
      )}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {[item.detail, item.credits != null ? formatCredits(item.credits) : null, new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
          </p>
          {item.status === 'completed' && item.tool === 'diagram' && !item.image && !item.telegramRef && item.imagePath && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{savedCopy ? 'Refresh ke baad bhi 24 ghante tak yahan rahegi — hamesha ke liye Telegram par save kariye' : 'Time khatam — image ab available nahi'}</p>
          )}
          {item.status === 'completed' && item.tool === 'enhance' && left !== null && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{left > 0 ? `Download link ${left >= 1 ? `${Math.floor(left)} ghante` : 'kuch minute'} aur chalega` : 'Time khatam — video ab available nahi'}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {!item.image && savedCopy && <Button asChild variant="ghost" size="icon" className="size-8"><a href={savedCopy} download={`${slug(item.title)}.jpg`} aria-label={`Download ${item.title}`}><Download className="size-4" /></a></Button>}
          {item.image && <Button variant="ghost" size="icon" className="size-8" aria-label={`Download ${item.title}`} onClick={() => downloadDataUrl(item.image ?? '', `${slug(item.title)}.png`)}><Download className="size-4" /></Button>}
          {item.video && <Button variant="ghost" size="icon" className="size-8" aria-label={`Download ${item.title}`} onClick={() => item.video && downloadBlob(item.video, `${slug(item.title)}.mp4`)}><Download className="size-4" /></Button>}
          {!item.telegramRef && !item.video && item.tool !== 'diagram' && remoteAvailable && (
            <Button asChild variant="ghost" size="icon" className="size-8"><a href={`/api/studio-video-file?id=${encodeURIComponent(item.jobId ?? '')}&download=1`} aria-label={`Download ${item.title}`}><Download className="size-4" /></a></Button>
          )}
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${item.title}`} onClick={remove}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      {item.status === 'completed' && <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2"><TelegramSave item={item} />{item.telegramUrl && <a href={item.telegramUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Telegram mein dekhein</a>}</div>}
    </article>
  );
}

export function StudioGallery() {
  const items = useStudioItems();
  usePollJobs(items);
  return (
    <section aria-labelledby="studio-gallery-title" className="mt-8">
      <div className="flex items-end justify-between gap-2">
        <h2 id="studio-gallery-title" className="font-display text-xl font-semibold">Studio outputs</h2>
        <span className="text-xs text-muted-foreground">Media Telegram par · list is device par</span>
      </div>
      {items === null ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">Abhi kuch nahi bana. Upar kisi tool se pehla diagram, animation ya saaf video banaiye.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{items.map(i => <ItemCard key={i.id} item={i} />)}</div>
      )}
    </section>
  );
}

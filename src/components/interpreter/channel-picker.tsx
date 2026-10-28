import { useState } from 'react';
import { Loader2, Search, Clock, ChevronRight, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SAVED_CHANNELS, durationSeconds, type ChannelPage, type ChannelVideo } from '@/lib/youtube-channel';

/** Quick picks for the user's saved long-form channels plus any channel link or @handle. */
export function ChannelPicker({ disabled, onPick }: { disabled?: boolean; onPick(video: ChannelVideo): void }) {
  const [active, setActive] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [page, setPage] = useState<ChannelPage | null>(null);
  const [loading, setLoading] = useState(false), [more, setMore] = useState(false), [error, setError] = useState('');

  async function load(channel: string, label: string) {
    setActive(label); setLoading(true); setError(''); setPage(null);
    try {
      const res = await fetch(`/api/youtube-channel?channel=${encodeURIComponent(channel)}`);
      const j = await res.json() as ChannelPage & { error?: string };
      if (!res.ok) throw new Error(j.error || 'Channel नहीं खुला।');
      setPage(j);
    } catch (e) { setError(e instanceof Error ? e.message : 'Channel नहीं खुला।'); }
    finally { setLoading(false); }
  }
  async function loadMore() {
    if (!page?.continuation) return;
    setMore(true);
    try {
      const res = await fetch(`/api/youtube-channel?channel=${encodeURIComponent(page.channel.id)}&continuation=${encodeURIComponent(page.continuation)}`);
      const j = await res.json() as ChannelPage & { error?: string };
      if (!res.ok) throw new Error(j.error || 'और videos नहीं आईं।');
      const seen = new Set(page.videos.map(v => v.id));
      setPage({ ...page, videos: [...page.videos, ...j.videos.filter(v => !seen.has(v.id))], continuation: j.continuation });
    } catch (e) { setError(e instanceof Error ? e.message : 'और videos नहीं आईं।'); }
    finally { setMore(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Radio className="size-3.5 text-primary" />आपके channels</div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {SAVED_CHANNELS.map(c => (
          <button key={c.id} type="button" disabled={disabled} onClick={() => load(c.id, c.id)} aria-pressed={active === c.id}
            className="touch-btn shrink-0 rounded-full border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary/50 disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            {c.title}
          </button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (custom.trim()) void load(custom.trim(), 'custom'); }}>
        <Input value={custom} onChange={e => setCustom(e.target.value)} disabled={disabled} placeholder="Channel @handle या playlist link" aria-label="Channel or playlist link" className="h-10" />
        <Button type="submit" variant="secondary" size="icon" className="size-10 shrink-0" disabled={disabled || !custom.trim()} aria-label="Channel खोलो"><Search className="size-4" /></Button>
      </form>
      {loading && <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Latest videos ला रहा हूँ…</div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {page && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {page.channel.avatar && <img src={page.channel.avatar} alt="" className="size-8 rounded-full" loading="lazy" referrerPolicy="no-referrer" />}
            <p className="font-display text-sm font-semibold">{page.channel.title || 'Channel'}</p>
            <span className="text-xs text-muted-foreground">{page.videos.length} videos</span>
          </div>
          <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" aria-label="Channel videos">
            {page.videos.map(v => {
              const long = durationSeconds(v.duration) >= 3600;
              return (
                <li key={v.id}>
                  <button type="button" disabled={disabled} onClick={() => onPick(v)}
                    className="touch-btn group flex w-full gap-3 rounded-xl border bg-card p-2 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:opacity-50">
                    <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img src={v.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                      {v.duration && <span className="absolute right-1 bottom-1 rounded bg-foreground/80 px-1 font-mono text-[10px] text-background tabular-nums">{v.duration}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug font-medium">{v.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        {long && <span className="flex items-center gap-1 text-highlight"><Clock className="size-3" />लंबा podcast</span>}
                        {v.published && <span>{v.published}</span>}
                      </span>
                    </span>
                    <ChevronRight className="size-4 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          {page.continuation && <Button variant="ghost" size="sm" onClick={loadMore} disabled={more || disabled}>{more && <Loader2 className="size-4 animate-spin" />}और videos</Button>}
        </div>
      )}
    </div>
  );
}

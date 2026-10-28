import { History, Trash2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryEntry } from '@/lib/youtube-study-store';
import { interpreterInfo } from '@/lib/interpreter-models';
import { formatTime } from '@/components/youtube-dub';

/** Finished interpretations saved on this device; open instantly without spending credits again. */
export function StudyLibrary({ entries, activeKey, disabled, onOpen, onRemove }: {
  entries: LibraryEntry[]; activeKey: string | null; disabled?: boolean; onOpen(entry: LibraryEntry): void; onRemove(entry: LibraryEntry): void;
}) {
  if (!entries.length) return null;
  return (
    <section className="mt-12" aria-labelledby="library-title">
      <h2 id="library-title" className="flex items-center gap-2 text-lg font-semibold"><History className="size-5 text-primary" />आपकी लाइब्रेरी</h2>
      <p className="mt-1 text-sm text-muted-foreground">इसी device पर save है — दोबारा खोलने पर credits नहीं लगते।</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {entries.map(e => {
          const r = e.result, duration = r.dub?.at(-1)?.end;
          return (
            <li key={e.key} data-active={e.key === activeKey} className="group flex items-center gap-3 rounded-xl border bg-card p-2 pr-1 data-[active=true]:border-primary">
              <button type="button" disabled={disabled} onClick={() => onOpen(e)} className="touch-btn flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50">
                {r.videoId
                  ? <img src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                  : <span className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-accent"><PlayCircle className="size-6 text-primary" /></span>}
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm leading-snug font-medium">{r.title || 'Video'}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {[r.engine ? interpreterInfo(r.engine).name : null, duration ? formatTime(duration) : null, new Date(e.savedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
              <Button variant="ghost" size="icon" disabled={disabled} aria-label={`${r.title || 'Video'} लाइब्रेरी से हटाओ`} onClick={() => onRemove(e)} className="shrink-0 text-muted-foreground"><Trash2 className="size-4" /></Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

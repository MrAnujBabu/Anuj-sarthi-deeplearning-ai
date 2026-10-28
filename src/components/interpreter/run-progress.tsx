import { Check, Loader2, Square, Ear, BookOpenText, Languages, ShieldCheck, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { RunState } from '@/lib/interpret-client';
import { hourSections } from '@/lib/interpret-checkpoint';
import { formatTime } from '@/components/youtube-dub';

type Step = { key: string; label: string; icon: typeof Ear; state: 'done' | 'active' | 'todo'; detail?: string | undefined };

function steps(s: RunState, interpreter: string, quality: boolean): Step[] {
  const order = ['source', 'listen', 'brief', 'interpret'] as const;
  const at = s.stage === 'idle' ? -1 : order.indexOf(s.stage);
  const state = (i: number): Step['state'] => (at > i ? 'done' : at === i ? 'active' : 'todo');
  const list: Step[] = [{ key: 'source', label: 'Video और captions पढ़ना', icon: Link2, state: state(0), detail: s.title || undefined }];
  if (s.listening) list.push({ key: 'listen', label: 'Gemini 4 Argon आवाज़ सुन रहा है', icon: Ear, state: state(1),
    detail: s.listen ? `${formatTime(s.listen.reached)}${s.listen.total ? ` / ${formatTime(s.listen.total)}` : ''}` : undefined });
  list.push({ key: 'brief', label: 'GPT-6 Astra: विषय और ज़रूरी शब्द', icon: BookOpenText, state: state(2),
    detail: s.brief?.glossary.length ? `${s.brief.glossary.length} शब्द · ${s.brief.domain}` : undefined });
  list.push({ key: 'interpret', label: `${interpreter}: सरल Hindi`, icon: Languages, state: state(3), detail: s.total ? `${s.done}/${s.total} हिस्से` : undefined });
  if (quality) list.push({ key: 'review', label: 'दूसरा premium model हर हिस्सा जाँच रहा है', icon: ShieldCheck, state: s.stage === 'interpret' ? 'active' : 'todo',
    detail: s.quality ? `${s.quality.corrected} सुधार` : undefined });
  return list;
}

export function RunProgress({ state, interpreter, quality, onCancel }: { state: RunState; interpreter: string; quality: boolean; onCancel(): void }) {
  const pct = state.stage === 'listen' && state.listen?.total ? (state.listen.reached / state.listen.total) * 100
    : state.stage === 'interpret' && state.total ? (state.done / state.total) * 100 : null;
  return (
    <section aria-live="polite" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">Expert team काम कर रही है</p>
          <p className="mt-0.5 text-sm text-muted-foreground" data-testid="run-message">{state.message || 'शुरू कर रहा हूँ…'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel} className="touch-btn shrink-0"><Square className="size-3.5" />रोकें</Button>
      </div>
      {pct !== null && <Progress value={pct} className="mt-4 h-1.5" aria-label="Progress" />}
      <ol className="mt-4 space-y-2.5">
        {steps(state, interpreter, quality).map(step => (
          <li key={step.key} className="flex items-center gap-3 text-sm" data-state={step.state}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border data-[s=done]:border-primary data-[s=done]:bg-primary data-[s=done]:text-primary-foreground data-[s=active]:border-primary data-[s=active]:text-primary" data-s={step.state}>
              {step.state === 'done' ? <Check className="size-3.5" /> : step.state === 'active' ? <Loader2 className="size-3.5 animate-spin" /> : <step.icon className="size-3.5 text-muted-foreground" />}
            </span>
            <span className={step.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}>{step.label}</span>
            {step.detail && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground tabular-nums">{step.detail}</span>}
          </li>
        ))}
      </ol>
      {(() => {
        const hours = hourSections(state.timeline.map(t => t.start), state.hindi);
        if (hours.length < 2) return null;
        return (
          <div className="mt-4" data-testid="hour-sections">
            <p className="text-xs text-muted-foreground">घंटे के हिसाब से — हर पूरा हिस्सा इसी device पर save होता है</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {hours.map(h => (
                <li key={h.hour} data-done={h.done === h.total} className="rounded-md border px-2 py-1 text-xs tabular-nums data-[done=true]:border-primary data-[done=true]:bg-primary data-[done=true]:text-primary-foreground">
                  घंटा {h.hour + 1}: {h.done}/{h.total}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
      {state.stage === 'interpret' && state.timeline.length > 0 && state.videoId && (
        <p className="mt-4 rounded-lg bg-accent/60 px-3 py-2 text-xs text-accent-foreground">नीचे video अभी से चला सकते हैं — जो हिस्से तैयार होते जाएँगे, Hindi voice उन्हें बोलती जाएगी।</p>
      )}
    </section>
  );
}

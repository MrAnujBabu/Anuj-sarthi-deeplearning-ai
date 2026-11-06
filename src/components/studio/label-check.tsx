import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { postJson } from './studio-shared';

type Item = { label: string; status: 'correct' | 'wrong' | 'misspelled' | 'missing' | 'extra'; note: string };
type Result = { verdict: 'ok' | 'issues'; summary: string; items: Item[] };
const TEXT: Record<Item['status'], string> = { correct: 'Sahi', wrong: 'Galat', misspelled: 'Spelling galat', missing: 'Missing', extra: 'NCERT mein nahi' };

/** Runs automatically for every new diagram and shows how its labels match the NCERT figure. */
export function LabelCheck({ image, topic, labels }: { image: string; topic: string; labels: string }) {
  const [state, setState] = useState<{ busy: boolean; result?: Result; error?: string }>({ busy: true });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ busy: true });
    postJson<Result>('/api/studio-label-check', { image, topic, labels }, ctrl.signal, { exclusive: false })
      .then(result => setState({ busy: false, result }))
      .catch(e => { if (!ctrl.signal.aborted) setState({ busy: false, error: e instanceof Error ? e.message : 'Label check nahi ho paaya.' }); });
    return () => ctrl.abort();
  }, [image, topic, labels]);

  if (state.busy) return <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />NCERT figure se labels mila rahe hain…</p>;
  if (state.error || !state.result) return <p className="mt-3 text-xs text-destructive">{state.error} Labels ko NCERT figure se khud milaa lijiye.</p>;
  const { verdict, summary, items } = state.result;
  const problems = items.filter(i => i.status !== 'correct');
  return (
    <section className="mt-3 rounded-xl border bg-card p-3 text-sm" aria-label="NCERT label check">
      <p className={`flex items-center gap-2 font-medium ${verdict === 'ok' ? 'text-primary' : 'text-destructive'}`}>
        {verdict === 'ok' ? <CheckCircle2 className="size-4" /> : <TriangleAlert className="size-4" />}
        {verdict === 'ok' ? 'Labels NCERT figure se mel khaate hain' : `${problems.length} label(s) mein gadbad`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((i, n) => (
            <li key={n} className="flex flex-wrap gap-x-2 text-xs">
              <span className={i.status === 'correct' ? 'text-primary' : 'font-medium text-destructive'}>{TEXT[i.status]}</span>
              <span className="text-foreground">{i.label}</span>
              {i.note && <span className="text-muted-foreground">— {i.note}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">AI check hai — shak ho to NCERT book ka figure dekh lijiye.</p>
    </section>
  );
}

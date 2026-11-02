import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCw, Download } from 'lucide-react';
import { listVoiceCalls } from '@/lib/voice-history.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { documentMetadata } from '@/lib/voice-usage';

export function AdminVoiceHistory() {
  const list = useServerFn(listVoiceCalls);
  const [calls, setCalls] = useState<Awaited<ReturnType<typeof listVoiceCalls>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  async function refresh() {
    setBusy(true); setError('');
    try { setCalls(await list()); }
    catch (e) { setError(e instanceof Error ? e.message : 'History unavailable'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const shown = calls.filter(c => `${c.id} ${c.voice} ${c.status} ${documentMetadata(c.documents).map(d => d.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  function download() {
    const report = ['# SnapSolve voice call report', 'Credits unconfirmed unless recorded by billing. Audio and PDF contents are not retained.', ...shown.map(c => `\n## ${c.id}\n- Started: ${c.created_at}\n- Ended: ${c.ended_at ?? 'Unconfirmed'}\n- Status: ${c.status}\n- Voice: ${c.voice} / ${c.accent}\n- Confirmed duration: ${c.confirmed_seconds ?? 'Unknown'} seconds\n- Final usage: ${c.finalized}\n- Answers: ${c.answer_count}\n- Searches: ${c.search_count}\n- Credits: ${c.credit_total ?? 'Unconfirmed'}\n- Documents: ${documentMetadata(c.documents).map(d => `${d.name} (${d.method}, ${d.pages} pages)`).join(', ') || 'None'}\n- Last event: ${c.last_error ?? 'None'}`)].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }));
    const a = document.createElement('a'); a.href = url; a.download = 'SnapSolve-voice-calls.md'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Voice call history" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Voice calls</h2><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={refresh}><RefreshCw className="size-4" />Refresh</Button><Button variant="outline" disabled={!shown.length} onClick={download}><Download className="size-4" />Report</Button></div></div>
    <p className="text-sm text-muted-foreground">Latest {calls.length} calls · {calls.filter(c => c.finalized).length} finalized · {calls.reduce((s,c) => s+c.answer_count,0)} answers · Credits unconfirmed</p>
    <Input type="search" aria-label="Search voice calls" placeholder="Search call, voice or PDF…" value={query} onChange={e => setQuery(e.target.value)} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {busy && <p role="status" className="text-sm text-muted-foreground">Loading calls…</p>}
    {!busy && !error && !shown.length && <p className="text-sm text-muted-foreground">No recorded calls.</p>}
    <ul className="divide-y divide-border">{shown.map(c => <li key={c.id} className="space-y-2 py-4">
      <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{new Date(c.created_at).toLocaleString()} · {c.status}</p><span className="text-xs text-muted-foreground">{c.id.slice(0,8)}</span></div>
      <p className="text-sm">{c.voice} · {c.accent} · {c.quiz ? 'Quiz' : 'Doubt'}{c.search ? ' + Search' : ''}</p>
      <p className="text-sm text-muted-foreground">{c.confirmed_seconds ?? '—'} confirmed seconds · {c.finalized ? 'Final usage received' : 'Final usage unconfirmed'} · {c.answer_count} answers · {c.search_count} searches · Credits {c.credit_total ?? 'unconfirmed'}</p>
      {documentMetadata(c.documents).map(d => <p className="break-words text-xs" key={d.name}>{d.name} · {d.pages} pages · {d.method.toUpperCase()}</p>)}
      {c.last_error && <p className="break-words text-xs text-muted-foreground">Last event: {c.last_error}</p>}
    </li>)}</ul>
  </section>;
}
import { BookOpenText, ShieldCheck, Ear, Languages, Captions, Globe, Upload, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InterpretResult, SourceOrigin } from '@/lib/interpret-protocol';
import { formatTime } from '@/components/youtube-dub';

const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  captions: 'Creator के captions', 'auto-captions': 'YouTube auto-captions', listened: 'Gemini ने सुनकर लिखा', subtitles: 'Subtitle file', pasted: 'Paste किया transcript',
};
const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi', ur: 'Urdu', es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', ru: 'Russian', pt: 'Portuguese', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi' };
export const languageName = (code?: string) => (code ? LANGUAGE[code.slice(0, 2)] ?? code.toUpperCase() : '');

export function SourceBadges({ result }: { result: InterpretResult }) {
  const s = result.source, kind = s?.kind ?? (result.videoId ? 'youtube' : 'text');
  const Icon = kind === 'upload' ? Upload : kind === 'web' ? Globe : kind === 'text' ? FileText : Captions;
  const duration = result.dub?.at(-1)?.end;
  return (
    <div className="flex flex-wrap gap-2">
      {s?.origin && <Badge variant="secondary" className="gap-1.5 font-normal"><Icon className="size-3.5" />{ORIGIN_LABEL[s.origin]}</Badge>}
      {s?.language && <Badge variant="secondary" className="font-normal">{languageName(s.language)} → सरल Hindi</Badge>}
      {duration ? <Badge variant="secondary" className="font-normal tabular-nums">{formatTime(duration)}</Badge> : null}
      {result.truncated && <Badge variant="outline" className="border-highlight/50 font-normal text-highlight">लंबी video — शुरुआती हिस्सा</Badge>}
    </div>
  );
}

/** Who did what on this video, and what the second-opinion review changed. */
export function TeamCard({ result }: { result: InterpretResult }) {
  const p = result.panel;
  if (!p) return null;
  const rows = [
    p.listener && { icon: Ear, role: 'सुना', who: p.listener },
    p.terminologist && { icon: BookOpenText, role: 'शब्द-सूची', who: p.terminologist },
    p.interpreters.length && { icon: Languages, role: 'समझाया', who: p.interpreters.join(' + ') },
    p.reviewers?.length && { icon: ShieldCheck, role: 'जाँचा', who: p.reviewers.join(' + ') },
  ].filter(Boolean) as { icon: typeof Ear; role: string; who: string }[];
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold"><Sparkles className="size-4 text-primary" />Expert team</p>
      <ul className="mt-3 space-y-2">
        {rows.map(r => <li key={r.role} className="flex items-center gap-2.5 text-sm"><r.icon className="size-4 shrink-0 text-primary" /><span className="w-16 shrink-0 text-muted-foreground">{r.role}</span><span className="min-w-0 truncate">{r.who}</span></li>)}
      </ul>
      {p.reviewed ? <p className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-xs text-accent-foreground">{p.reviewed} हिस्से जाँचे गए · {p.corrected ?? 0} में सुधार किया गया</p> : null}
    </div>
  );
}

export function BriefCard({ result }: { result: InterpretResult }) {
  const b = result.brief;
  if (!b || (!b.summary && !b.glossary.length)) return null;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold"><BookOpenText className="size-4 text-primary" />Video किस बारे में है</p>
      {b.domain && <p className="mt-1 text-xs text-muted-foreground">{b.domain}</p>}
      {b.summary && <p className="mt-2 text-sm leading-relaxed">{b.summary}</p>}
      {b.glossary.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">ज़रूरी शब्द</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {b.glossary.slice(0, 24).map(g => <li key={g.term} className="rounded-lg border bg-background px-2 py-1 text-xs"><span className="font-medium">{g.term}</span><span className="text-muted-foreground"> · {g.hindi}</span></li>)}
          </ul>
        </div>
      )}
      {b.corrections.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Captions में {b.corrections.length} गलत सुने शब्द ठीक किए गए (जैसे “{b.corrections[0]?.heard}” → “{b.corrections[0]?.correct}”).</p>}
    </div>
  );
}

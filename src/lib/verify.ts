// Shared (browser-safe) types and pure logic for the answer-checking council.
// The council: Gemini 3.1 Pro (Google-grounded facts + photo reading) and GPT-6 Astra
// (maths / logic) review the tutor's answer; on disagreement they debate one round and
// Claude Fable 5.1 (the tutor who wrote the answer) rules on every objection.

export type Verdict = 'verified' | 'needs_fix' | 'unsure';
export type Issue = { line: string; fix: string };
export type Source = { title?: string; url: string };
export type CouncilRole = 'gemini' | 'openai' | 'chair';

export const COUNCIL_MODELS = {
  gemini: { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', job: 'Facts, NCERT & Google sources' },
  openai: { id: 'openai/gpt-6-astra', name: 'GPT-6 Astra', job: 'Maths, units & logic' },
  chair: { id: 'anthropic/claude-fable-5-1', name: 'Claude Fable 5.1', job: 'Tutor — weighs every objection' },
} as const;

/** Photo transcription model (photo → text before the tutor answers). */
export const VISION_MODEL = COUNCIL_MODELS.gemini.id;

export type CheckResult = { role: CouncilRole; round: 1 | 2 | 3; verdict: Verdict; issues: Issue[]; note: string; failed?: boolean };
export type CouncilResult = {
  verdict: Verdict;
  issues: Issue[];
  note: string;
  /** all-agree: both checkers confirmed Claude's answer. ruled: Claude weighed the objections. checkers-only: Claude ruling unavailable. */
  decidedBy: 'all-agree' | 'ruled' | 'checkers-only';
  checks: CheckResult[];
  sources: Source[];
  at: number;
};
export type CouncilStage = 'search' | 'review' | 'debate' | 'ruling';
export type CouncilEvent =
  | { type: 'stage'; stage: CouncilStage }
  | { type: 'check'; check: CheckResult }
  | { type: 'sources'; sources: Source[] }
  | { type: 'done'; result: CouncilResult }
  | { type: 'error'; message: string; status: number };

export const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'issues', 'note'],
  properties: {
    verdict: { type: 'string', enum: ['verified', 'needs_fix', 'unsure'] },
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['line', 'fix'],
        properties: { line: { type: 'string' }, fix: { type: 'string' } },
      },
    },
    note: { type: 'string' },
  },
} as const;

const VERDICTS: Verdict[] = ['verified', 'needs_fix', 'unsure'];

/** Normalise a reviewer's JSON (object or text containing JSON). Malformed → "unsure". */
export function toCheck(role: CouncilRole, round: CheckResult['round'], raw: unknown): CheckResult {
  let j: any = raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```(?:json)?/gi, '');
    const m = cleaned.match(/\{[\s\S]*\}/);
    try { j = JSON.parse(m ? m[0] : cleaned); } catch { j = null; }
  }
  if (!j || typeof j !== 'object') return { role, round, verdict: 'unsure', issues: [], note: 'Reply could not be read.', failed: true };
  const issues: Issue[] = Array.isArray(j.issues)
    ? j.issues
        .filter((i: any) => i && typeof i.line === 'string' && typeof i.fix === 'string' && i.fix.trim())
        .slice(0, 6)
        .map((i: any) => ({ line: i.line.trim().slice(0, 500), fix: i.fix.trim().slice(0, 700) }))
    : [];
  let verdict: Verdict = VERDICTS.includes(j.verdict) ? j.verdict : 'unsure';
  if (verdict === 'needs_fix' && !issues.length) verdict = 'unsure';
  return { role, round, verdict, issues, note: typeof j.note === 'string' ? j.note.trim().slice(0, 500) : '' };
}

/** Any correction wins; "verified" only when every reviewer agrees. */
export function mergeVerdicts(checks: Pick<CheckResult, 'verdict'>[]): Verdict {
  if (!checks.length) return 'unsure';
  if (checks.some((c) => c.verdict === 'needs_fix')) return 'needs_fix';
  return checks.every((c) => c.verdict === 'verified') ? 'verified' : 'unsure';
}

/** Both checkers independently confirmed the tutor → all three agree, no debate needed. */
export function allAgree(checks: Pick<CheckResult, 'verdict' | 'failed'>[]) {
  return checks.length >= 2 && checks.every((c) => c.verdict === 'verified' && !c.failed);
}

export type CouncilStep = 'agree' | 'unavailable' | 'debate' | 'ruling';
/**
 * What the council does after a review round:
 * agree → both reviewers confirmed the tutor (all three agree, done);
 * debate → after round 1 both answered with different verdicts (each answers the other once);
 * ruling → Claude weighs the objections; unavailable → no reviewer answered.
 */
export function councilNextStep(round: 1 | 2, g: Pick<CheckResult, 'verdict' | 'failed'>, o: Pick<CheckResult, 'verdict' | 'failed'>): CouncilStep {
  if (allAgree([g, o])) return 'agree';
  if (g.failed && o.failed) return 'unavailable';
  if (round === 1 && !g.failed && !o.failed && g.verdict !== o.verdict) return 'debate';
  return 'ruling';
}

/** Parse one NDJSON line from /api/verify. */
export function parseCouncilLine(line: string): CouncilEvent | null {
  try {
    const e = JSON.parse(line);
    return e && typeof e.type === 'string' ? (e as CouncilEvent) : null;
  } catch { return null; }
}

export const PHOTO_OPEN = '<photo-reading';
export const PHOTO_RE = /<photo-reading[^>]*>([\s\S]*?)<\/photo-reading>\s*/g;

/** Wrap Gemini's photo transcription so the tutor sees it and the UI can fold it away. */
export function wrapPhotoReading(reading: string) {
  return `<photo-reading by="${COUNCIL_MODELS.gemini.name}">\nText reading of the attached photo by ${COUNCIL_MODELS.gemini.name}. Use it together with the image; if they disagree, trust the image.\n\n${reading.trim()}\n</photo-reading>\n\n`;
}

/** Remove the photo-reading block for display, returning the reading separately. */
export function splitPhotoReading(text: string): { reading: string | null; rest: string } {
  const m = [...text.matchAll(PHOTO_RE)][0];
  if (!m) return { reading: null, rest: text };
  const body = (m[1] ?? '').replace(/^\s*Text reading of the attached photo[^\n]*\n+/, '').trim();
  return { reading: body, rest: text.replace(PHOTO_RE, '') };
}

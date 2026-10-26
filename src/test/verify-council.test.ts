import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { COUNCIL_MODELS, VISION_MODEL, allAgree, councilNextStep, mergeVerdicts, splitPhotoReading, toCheck, wrapPhotoReading } from '@/lib/verify';
import { councilInputFor, isWorthChecking } from '@/lib/council-input';
import { RESUME_TEXT } from '@/lib/chat-resume';

const ok = { verdict: 'verified' as const };
const fix = { verdict: 'needs_fix' as const };
const unsure = { verdict: 'unsure' as const };
const down = { verdict: 'unsure' as const, failed: true };

describe('council line-up (top model per job)', () => {
  it('Gemini 4 Argon checks facts and reads photos, GPT-6 Astra checks maths, Claude Fable 5.1 rules', () => {
    expect(COUNCIL_MODELS.gemini.id).toBe('google/gemini-4-argon');
    expect(COUNCIL_MODELS.openai.id).toBe('openai/gpt-6-astra');
    expect(COUNCIL_MODELS.chair.id).toBe('anthropic/claude-fable-5-1');
    expect(VISION_MODEL).toBe('google/gemini-4-argon');
  });
});

describe('council decision rules', () => {
  it('both reviewers confirm the tutor → all three agree, no debate or ruling', () => {
    expect(councilNextStep(1, ok, ok)).toBe('agree');
  });
  it('reviewers reach different verdicts in round 1 → debate', () => {
    expect(councilNextStep(1, ok, fix)).toBe('debate');
    expect(councilNextStep(1, unsure, ok)).toBe('debate');
  });
  it('both reviewers agree there is an error → straight to Claude ruling (no debate)', () => {
    expect(councilNextStep(1, fix, fix)).toBe('ruling');
  });
  it('still disagreeing after the debate → Claude rules', () => {
    expect(councilNextStep(2, ok, fix)).toBe('ruling');
  });
  it('one reviewer down → Claude rules on the other report; both down → unavailable', () => {
    expect(councilNextStep(1, down, fix)).toBe('ruling');
    expect(councilNextStep(1, down, ok)).toBe('ruling');
    expect(councilNextStep(1, down, down)).toBe('unavailable');
  });
  it('a failed reviewer never counts as agreement', () => {
    expect(allAgree([ok, { verdict: 'verified', failed: true }])).toBe(false);
  });
  it('any correction wins when merging; verified needs everyone', () => {
    expect(mergeVerdicts([ok, fix])).toBe('needs_fix');
    expect(mergeVerdicts([ok, unsure])).toBe('unsure');
    expect(mergeVerdicts([ok, ok])).toBe('verified');
    expect(mergeVerdicts([])).toBe('unsure');
  });
});

describe('reviewer reply parsing', () => {
  it('reads fenced JSON text', () => {
    const c = toCheck('gemini', 1, '```json\n{"verdict":"needs_fix","issues":[{"line":"F = 2 + 3 = 5 N","fix":"F = 2 × 3 = 6 N"}],"note":"Added instead of multiplied."}\n```');
    expect(c.verdict).toBe('needs_fix');
    expect(c.issues).toEqual([{ line: 'F = 2 + 3 = 5 N', fix: 'F = 2 × 3 = 6 N' }]);
  });
  it('a correction claim without any concrete fix becomes unsure', () => {
    expect(toCheck('openai', 1, { verdict: 'needs_fix', issues: [], note: 'x' }).verdict).toBe('unsure');
  });
  it('unreadable replies become unsure and are marked failed', () => {
    const c = toCheck('chair', 3, 'I think it is fine');
    expect(c.verdict).toBe('unsure');
    expect(c.failed).toBe(true);
  });
});

describe('photo reading', () => {
  it('wraps the reading for the tutor and folds it away for display', () => {
    const text = wrapPhotoReading('Q. Find the force. (A) 5 N (B) 6 N') + 'Solve this question step by step.';
    expect(text).toContain('Gemini 4 Argon');
    const { reading, rest } = splitPhotoReading(text);
    expect(reading).toBe('Q. Find the force. (A) 5 N (B) 6 N');
    expect(rest).toBe('Solve this question step by step.');
  });
});

describe('what the council checks', () => {
  const msg = (id: string, role: UIMessage['role'], parts: UIMessage['parts']): UIMessage => ({ id, role, parts });
  const messages = [
    msg('u1', 'user', [{ type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,AAA' }, { type: 'text', text: 'Solve this' }]),
    msg('a1', 'assistant', [{ type: 'text', text: 'Answer part one' }]),
    msg('u2', 'user', [{ type: 'text', text: RESUME_TEXT }]),
    msg('a2', 'assistant', [{ type: 'text', text: 'continued' }]),
  ];
  it('uses the nearest real question with its photo, skipping resume turns', () => {
    expect(councilInputFor(messages, 3)).toEqual({ question: 'Solve this', images: ['data:image/jpeg;base64,AAA'] });
  });
  it('auto-check skips one-line replies', () => {
    expect(isWorthChecking('Theek hai!')).toBe(false);
    expect(isWorthChecking('x'.repeat(200))).toBe(true);
  });
});

describe('asking the tutor about a correction', () => {
  it('lists every accepted mistake with its fix', async () => {
    const { correctionRequest } = await import('@/lib/verify');
    const t = correctionRequest([{ line: 'F = 2 + 3 = 5 N', fix: 'F = 2 × 3 = 6 N' }]);
    expect(t).toContain('Wrong: "F = 2 + 3 = 5 N"');
    expect(t).toContain('Correct: "F = 2 × 3 = 6 N"');
    expect(t).toContain('this mistake');
  });
});

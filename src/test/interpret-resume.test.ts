import { describe, expect, it } from 'vitest';
import { interpretTimed } from '@/lib/interpreter.server';
import { checkpointKey, hourSections, isResumable, isRecoverable, isTransientFailure } from '@/lib/interpret-checkpoint';
import { creditPauseDecision, CREDIT_PROBE_MS } from '@/lib/ai/pause-policy';
import { InterpretStreamError } from '@/lib/interpret-protocol';

const segs = Array.from({ length: 8 }, (_, i) => ({ start: i * 30, end: i * 30 + 30, text: `part ${i}` }));
const answer = (count: number) => Array.from({ length: count }, (_, i) => `### ${i + 1}\nहिस्सा ${i + 1}।`).join('\n');

describe('resuming a long interpretation', () => {
  it('does not pay again for batches already finished (only the unfinished batch is sent)', async () => {
    let calls = 0;
    const saved = ['a।', 'b।', 'c।', 'd।', '', '', '', ''];
    const seen: number[] = [];
    const out = await interpretTimed({
      segments: segs, context: { title: 'T', brief: null }, engine: 'claude', signal: new AbortController().signal, review: false, saved,
      onSegment: i => seen.push(i),
      call: async () => { calls++; return answer(4); },
    });
    expect(calls).toBe(1);
    expect(out.lines.slice(0, 4)).toEqual(['a।', 'b।', 'c।', 'd।']);
    expect(out.lines.slice(4).every(Boolean)).toBe(true);
    expect(seen.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('ignores saved lines that do not match the segment count', async () => {
    let calls = 0;
    await interpretTimed({
      segments: segs, context: { title: 'T', brief: null }, engine: 'claude', signal: new AbortController().signal, review: false, saved: ['x।'],
      onSegment: () => {}, call: async () => { calls++; return answer(4); },
    });
    expect(calls).toBe(2);
  });

  it('groups a long video by hour', () => {
    const starts = [0, 1800, 3600, 5400, 7200];
    expect(hourSections(starts, ['x', 'y', 'z', '', ''])).toEqual([{ hour: 0, done: 2, total: 2 }, { hour: 1, done: 1, total: 2 }, { hour: 2, done: 0, total: 1 }]);
  });

  it('offers continue only for partly finished work', () => {
    const base = { key: 'k', savedAt: 0, title: '', starts: [0, 30], brief: null };
    expect(isResumable({ ...base, lines: ['x', ''] })).toBe(true);
    expect(isResumable({ ...base, lines: ['x', 'y'] })).toBe(false);
    expect(isResumable({ ...base, lines: ['', ''] })).toBe(false);
    expect(isRecoverable({ ...base, lines: ['x', 'y'] })).toBe(true);
    expect(isRecoverable({ ...base, lines: ['', ''] })).toBe(false);
  });

  it('keys progress by source, interpreter and review setting', () => {
    const a = checkpointKey({ kind: 'link', url: 'https://youtu.be/x ' }, 'claude', true);
    expect(a).toBe(checkpointKey({ kind: 'link', url: 'https://youtu.be/x' }, 'claude', true));
    expect(a).not.toBe(checkpointKey({ kind: 'link', url: 'https://youtu.be/x' }, 'claude', false));
  });

  it('auto-continues only for busy/network failures, never for credits or denials', () => {
    expect(isTransientFailure(new InterpretStreamError('busy', 429))).toBe(true);
    expect(isTransientFailure(new InterpretStreamError('cut', 502))).toBe(true);
    expect(isTransientFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientFailure(new InterpretStreamError('credits', 402))).toBe(false);
    expect(isTransientFailure(new InterpretStreamError('denied', 403))).toBe(false);
  });
});

describe('remembered "credits finished" pause', () => {
  const now = Date.parse('2026-10-28T12:00:00Z');
  it('blocks for 10 minutes, then lets one probe check whether credits were added', () => {
    expect(CREDIT_PROBE_MS).toBe(10 * 60_000);
    expect(creditPauseDecision({ kind: 'credits', updated_at: new Date(now - 9 * 60_000).toISOString() }, now)).toBe('block');
    expect(creditPauseDecision({ kind: 'credits', updated_at: new Date(now - 10 * 60_000).toISOString() }, now)).toBe('probe');
  });
  it('never probes a provider denial', () => {
    expect(creditPauseDecision({ kind: 'denied', updated_at: '2020-01-01T00:00:00Z' }, now)).toBe('block');
  });
});

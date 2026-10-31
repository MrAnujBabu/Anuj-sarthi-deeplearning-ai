import { expect, it } from 'vitest';
import { applyReview, interpretTimed } from '@/lib/interpreter.server';

it('does not count a malformed English reviewer note as approval', () => {
  const checked = applyReview(['हमारे पास 2 examples हैं।'], '### 1\nLooks mostly fine but check it');
  expect(checked.reviewed).toBe(0);
  expect(checked.lines).toEqual(['हमारे पास 2 examples हैं।']);
});

it('rechecks saved translations without paying for a new translation', async () => {
  const engines: string[] = [];
  const out = await interpretTimed({ segments: [{ start: 0, end: 30, text: 'We have two examples.' }],
    context: { title: 'Examples', brief: null }, engine: 'claude', signal: new AbortController().signal,
    saved: ['हमारे पास 2 examples हैं।'], review: true, onSegment: () => {},
    call: async engine => { engines.push(engine); return '### 1\nOK'; },
  });
  expect(engines).toEqual(['gpt']);
  expect(out.quality.reviewed).toBe(1);
});

it('keeps approved simple Hindi exactly and applies a correction only to its own timed block', () => {
  const original = ['मैं आज यहाँ आया हूँ।', 'हमारे पास 3 examples हैं।'];
  const checked = applyReview(original, '### 1\nOK\n### 2\nहमारे पास 2 examples हैं।');
  expect(checked.lines).toEqual(['मैं आज यहाँ आया हूँ।', 'हमारे पास 2 examples हैं।']);
  expect(checked.reviewed).toBe(2);
  expect(checked.corrected).toBe(1);
});

it('publishes second-vendor corrections in the original timestamp order', async () => {
  const published: [number, string][] = [];
  const engines: string[] = [];
  const result = await interpretTimed({
    segments: [{ start: 0, end: 10, text: 'I arrived today.' }, { start: 10, end: 20, text: 'We have two examples.' }],
    context: { title: 'Examples', brief: null }, engine: 'claude', signal: new AbortController().signal,
    onSegment: (i, hindi) => published.push([i, hindi]),
    call: async engine => {
      engines.push(engine);
      return engine === 'claude' ? '### 1\nमैं आज आया हूँ।\n### 2\nहमारे पास 3 examples हैं।' : '### 1\nOK\n### 2\nहमारे पास 2 examples हैं।';
    },
  });
  expect(engines).toEqual(['claude', 'gpt']);
  expect(published).toEqual([[0, 'मैं आज आया हूँ।'], [1, 'हमारे पास 2 examples हैं।']]);
  expect(result.lines).toEqual(published.map(([, text]) => text));
});
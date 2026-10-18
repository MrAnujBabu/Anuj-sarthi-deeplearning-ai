import { describe, expect, it } from 'vitest';
import { completePracticeCard, nextPracticeId, restorePracticeSession } from '@/lib/practice-session';

describe('credit-free practice session persistence',()=>{
  it('keeps remaining order after review changes due-date ordering',()=>{
    const session=completePracticeCard(restorePracticeSession(['a','b','c'],{}),'a');
    const restored=restorePracticeSession(['b','c','a'],session);
    expect(restored.queue).toEqual(['a','b','c']);
    expect(nextPracticeId(restored)).toBe('b');
  });
  it('includes new material after a completed session',()=>{
    expect(nextPracticeId(restorePracticeSession(['a','b'],{queue:['a'],completed:['a']}))).toBe('b');
  });
  it('retains a restarted session after reload',()=>{
    expect(nextPracticeId(restorePracticeSession(['a','b'],{queue:['a','b'],completed:[]}))).toBe('a');
  });
});
import { afterEach, expect, it } from 'vitest';
import { loadCards, recordResults } from '@/lib/srs';
afterEach(() => localStorage.clear());
it.each(['broken-json', '{}', '[null,12]'])('recovers corrupt review index %s without crashing', value => {
  localStorage.setItem('snapsolve.cards.seen', value);
  recordResults('answer', [{ q: 'Force?', a: '6 N', correct: true }]);
  recordResults('answer', [{ q: 'Force?', a: '6 N', correct: true }]);
  expect(loadCards()[0]?.reviews).toBe(1);
});
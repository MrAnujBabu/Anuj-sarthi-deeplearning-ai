import { describe, expect, it } from 'vitest';
import { groupCues } from '@/lib/transcript-cues';

describe('rolling captions', () => {
  it('does not repeat the last line of a part at the start of the next', () => {
    const cues = [
      { start: 0, end: 4, text: 'photosynthesis happens in leaves' },
      { start: 25, end: 29, text: 'photosynthesis happens in leaves and needs sunlight' },
      { start: 31, end: 35, text: 'and needs sunlight to make glucose' },
    ];
    const parts = groupCues(cues, 30);
    expect(parts.map(p => p.text)).toEqual(['photosynthesis happens in leaves and needs sunlight', 'to make glucose']);
  });

  it('drops a cue that only repeats what was already said', () => {
    const parts = groupCues([{ start: 0, end: 3, text: 'hello class' }, { start: 3, end: 5, text: 'hello class' }, { start: 5, end: 8, text: 'today we study cells' }]);
    expect(parts[0]?.text).toBe('hello class today we study cells');
  });

  it('keeps genuinely new speech untouched', () => {
    const parts = groupCues([{ start: 0, end: 3, text: 'the cell' }, { start: 3, end: 6, text: 'is the unit of life' }]);
    expect(parts[0]?.text).toBe('the cell is the unit of life');
  });
});

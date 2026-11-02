import { describe, it, expect } from 'vitest';
import { billableSeconds, confirmedSeconds, documentMetadata } from './voice-usage';

describe('verified voice usage', () => {
  it('uses a 15-second initialization minimum, not an extra charge', () => {
    expect(billableSeconds(10, true)).toBe(15);
    expect(billableSeconds(90, true)).toBe(90);
    expect(billableSeconds(null, false)).toBeNull();
  });
  it('rejects invalid durations and keeps cumulative snapshots separate', () => {
    expect(confirmedSeconds(-1)).toBeNull();
    expect(confirmedSeconds('90')).toBeNull();
    expect(confirmedSeconds(Infinity)).toBeNull();
    expect(confirmedSeconds(90)).toBe(90);
  });
  it('keeps document metadata but never text or raw PDF data', () => {
    expect(documentMetadata([{ name: 'NEET.pdf', pages: 2, method: 'ocr', chars: 150, text: 'private', data: 'secret' }])).toEqual([{ name: 'NEET.pdf', pages: 2, method: 'ocr', chars: 150 }]);
  });
});
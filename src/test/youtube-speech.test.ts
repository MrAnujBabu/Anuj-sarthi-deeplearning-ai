import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHindiSpeech, speechState, shouldUseBackup } from '@/lib/youtube-speech';

const ok = () => new Response('data: {}\n\n', { status: 200 });
describe('YouTube Hindi speech backup', () => {
  beforeEach(() => { speechState.useBackup = false; });
  it('switches to the backup voice when Sarvam credits run out (402)', async () => {
    const f = vi.fn().mockResolvedValueOnce(Response.json({ error: 'credits' }, { status: 402 })).mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await fetchHindiSpeech('नमस्ते', 'ishita_hi_edtech', new AbortController().signal);
    expect(f.mock.calls.map(c => c[0])).toEqual(['/api/sarvam-speech', '/api/speech']);
    await fetchHindiSpeech('फिर', 'ishita_hi_edtech', new AbortController().signal);
    expect(f.mock.calls[2]![0]).toBe('/api/speech');
  });
  it('does not fall back on a bad request', () => {
    expect(shouldUseBackup(400)).toBe(false);
    expect(shouldUseBackup(503)).toBe(true);
  });
});

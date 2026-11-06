import { describe, expect, it, vi } from 'vitest';
import { fetchHindiSpeech, speechState } from '@/lib/youtube-speech';
import { sarvamAvailable, setSarvamAvailable } from '@/lib/sarvam-status';
import { Route } from '@/routes/api/sarvam-speech';

const ok = () => new Response('data: {}\n\n', { status: 200 });

describe('Sarvam not connected', () => {
  it('goes straight to the backup voice without calling Sarvam', async () => {
    speechState.useBackup = false; speechState.backupUntil = 0; speechState.forceBackup = false;
    setSarvamAvailable(false);
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);
    await fetchHindiSpeech('नमस्ते', 'ishita_hi_edtech', new AbortController().signal, 0);
    expect(f.mock.calls.map(c => c[0])).toEqual(['/api/speech']);
  });
  it('reads the server answer once per page', async () => {
    setSarvamAvailable(null);
    const f = vi.fn().mockResolvedValue(Response.json({ configured: false }));
    vi.stubGlobal('fetch', f);
    expect(await sarvamAvailable()).toBe(false);
    expect(await sarvamAvailable()).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('keeps trying Sarvam when the check itself fails', async () => {
    setSarvamAvailable(null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await sarvamAvailable()).toBe(true);
  });
  it('server reports not configured when no Sarvam key exists', async () => {
    vi.stubEnv('SARVAM_API_KEY', ''); vi.stubEnv('UDC_SARVAM_AI_API_KEY', '');
    const handlers = (Route.options as unknown as { server: { handlers: { GET: () => Promise<Response> } } }).server.handlers;
    expect(await (await handlers.GET()).json()).toEqual({ configured: false });
    vi.unstubAllEnvs();
  });
});

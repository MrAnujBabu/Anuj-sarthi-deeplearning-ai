import { createFileRoute } from '@tanstack/react-router';

/** One 5-minute 16 kHz mono WAV piece is about 9.6 MB; allow a little headroom. */
const MAX_BYTES = 12 * 1024 * 1024;

function toBase64(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** Gemini 4 Argon listens to one browser-extracted audio piece and returns timestamped original speech. */
export const Route = createFileRoute('/api/media-listen')({
  server: { handlers: { POST: async ({ request }) => {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > MAX_BYTES + 65536) return Response.json({ error: 'Audio का हिस्सा बहुत बड़ा है।' }, { status: 413 });
    if (!request.body) return Response.json({ error: 'Audio नहीं मिली।' }, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES + 65536) { await reader.cancel(); return Response.json({ error: 'Audio का हिस्सा बहुत बड़ा है।' }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let form: FormData;
    try { form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') || '' }, body: bytes }).formData(); }
    catch { return Response.json({ error: 'Bad upload.' }, { status: 400 }); }
    const file = form.get('file');
    const start = Number(form.get('offset'));
    if (!(file instanceof File) || !file.size) return Response.json({ error: 'Audio नहीं मिली।' }, { status: 400 });
    if (!/^audio\/(wav|x-wav|wave)$/.test(file.type)) return Response.json({ error: 'सिर्फ WAV audio लिया जाता है।' }, { status: 415 });
    if (!Number.isFinite(start) || start < 0 || start > 24 * 3600) return Response.json({ error: 'Bad offset.' }, { status: 400 });
    const audio = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...audio.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...audio.subarray(8, 12)) !== 'WAVE') return Response.json({ error: 'WAV file सही नहीं है।' }, { status: 415 });
    const [{ getAiPause, noteAiSuccess, setAiPause }, { listenAudioChunk, describeFailure }] = await Promise.all([import('@/lib/ai/pause.server'), import('@/lib/interpreter.server')]);
    const paused = await getAiPause();
    if (paused?.kind === 'credits') return Response.json({ error: 'AI credits खत्म हो गए हैं — workspace में credits जोड़कर फिर चलाएँ।' }, { status: 402 });
    try {
      const heard = await listenAudioChunk(toBase64(audio), start, request.signal);
      void noteAiSuccess();
      return Response.json(heard);
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      const failure = describeFailure(error);
      if (failure.status === 402) await setAiPause({ kind: 'credits', status: 402, message: 'AI credits are unavailable. Restore workspace credits to continue.' }).catch(() => {});
      if (failure.status >= 500) console.error('[media-listen] failed', error instanceof Error ? error.message : error);
      return Response.json({ error: failure.message }, { status: failure.status === 499 ? 503 : failure.status });
    }
  } } },
});

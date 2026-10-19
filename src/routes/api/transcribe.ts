import { createFileRoute } from "@tanstack/react-router";
import { classifyAiFailure, encodeAiFailure } from '@/lib/ai/errors';
import { getAiPause, setAiPause } from '@/lib/ai/pause.server';

const MAX_BYTES = 20 * 1024 * 1024;
const MODEL = "openai/gpt-transcribe";
const json = (body: unknown, status = 200) => Response.json(body, { status });

export const Route = createFileRoute("/api/transcribe")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) return json({ error: 'Voice typing is not configured.' }, 503);
      const declared = Number(request.headers.get('content-length') || 0);
      if (declared > MAX_BYTES + 65536) return json({ error: 'Recording too large.' }, 413);
      // Bound actual multipart bytes, including chunked uploads, before parsing.
      if (!request.body) return json({ error: 'No audio received.' }, 400);
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES + 65536) {
          await reader.cancel();
          return json({ error: 'Recording too large.' }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let form: FormData;
      try {
        form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') || '' }, body: bytes }).formData();
      } catch { return json({ error: 'Bad upload.' }, 400); }
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'No audio received.' }, 400);
      if (!file.size || file.size > MAX_BYTES) return json({ error: 'Recording too long — keep it under 10 minutes.' }, 413);
      if (!file.type.startsWith('audio/')) return json({ error: 'Only audio is accepted.' }, 415);
      const paused = await getAiPause();
      if (paused) return json({ error: encodeAiFailure({ kind: paused.kind === 'credits' ? 'credits' : 'denied', message: paused.message, status: paused.kind === 'credits' ? 402 : 403 }) }, paused.kind === 'credits' ? 402 : 403);
      const modelPause = await getAiPause(MODEL);
      if (modelPause) return json({ error: encodeAiFailure({ kind: 'denied', message: modelPause.message, status: 403 }) }, 403);
      const body = new FormData();
      body.append('model', MODEL);
      body.append('file', file, file.name || 'dictation.wav');
      body.append('response_format', 'json');
      body.append('stream', 'true');
      body.append('languages', 'hi');
      body.append('languages', 'en');
      body.append('prompt', 'NEET student dictating a Physics, Chemistry or Biology doubt in Hindi, English or Hinglish.');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body, signal: request.signal,
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        const failure = classifyAiFailure(response.status, details);
        if (failure.kind === 'credits') await setAiPause(failure);
        if (failure.kind === 'denied' && !/provider_not_available_in_region|model_requires_retention_consent|model_vendor_not_enabled/.test(JSON.stringify(details))) await setAiPause(failure, MODEL);
        return json({ error: encodeAiFailure(failure) }, response.status);
      }
      // Relay bytes as they arrive instead of waiting for the final transcript.
      return new Response(response.body, { status: response.status, headers: {
        'Content-Type': response.headers.get('content-type') || 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      } });
    } catch (error) {
      if (request.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return new Response(null, { status: 499 });
      return json({ error: 'Voice typing could not start. Your saved practice is still available.' }, 503);
    }
  } } },
});

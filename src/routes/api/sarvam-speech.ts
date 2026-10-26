import { createFileRoute } from '@tanstack/react-router';
import { sarvamSpeechRequest, sarvamStreamEvents, isSarvamVoice, isSpeakableSarvamText, sarvamSkippedEvents, SARVAM_SPEECH_MODEL, SARVAM_STREAM_URL } from '@/lib/sarvam-speech';
import { getCurrentAiPause, setAiPause } from '@/lib/ai/pause.server';
import { classifyAiFailure, encodeAiFailure } from '@/lib/ai/errors';
import { isAiCancellation } from '@/lib/ai/cancellation';

export const Route = createFileRoute('/api/sarvam-speech')({
  server: { handlers: { POST: async ({ request }) => {
    try {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      const key = process.env['SARVAM_API_KEY'];
      if (!key) return Response.json({ error: 'Sarvam voice is not configured.' }, { status: 503 });
      let body: { text?: unknown; voice?: unknown } | null;
      try { body = await request.json(); } catch (error) {
        if (isAiCancellation(error, request.signal)) return new Response(null, { status: 499 });
        return Response.json({ error: 'Bad request.' }, { status: 400 });
      }
      if (!body || !isSarvamVoice(body.voice)) return Response.json({ error: 'Unsupported Sarvam voice.' }, { status: 400 });
      const text = typeof body.text === 'string' ? body.text.replace(/[#*_`>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500) : '';
      // Emoji/dots/dashes only: Sarvam would refuse it, and a refusal must not cost the call its voice.
      if (!isSpeakableSarvamText(text)) return new Response(sarvamSkippedEvents(), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
      const pauseId = `sarvam/${SARVAM_SPEECH_MODEL}`;
      const paused = await getCurrentAiPause(pauseId);
      if (request.signal.aborted) return new Response(null, { status: 499 });
      if (paused) return Response.json({ error: paused.message }, { status: paused.kind === 'credits' ? 402 : 403 });
      const upstream = await fetch(SARVAM_STREAM_URL, {
        method: 'POST', headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(sarvamSpeechRequest(text, body.voice)), signal: request.signal,
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        console.error(`Sarvam speech failed [${upstream.status}]: ${detail}`);
        let parsed: unknown = detail;
        try { parsed = JSON.parse(detail); } catch { /* Keep provider explanation. */ }
        const failure = classifyAiFailure(upstream.status, parsed);
        // A wrong or old Sarvam key is fixed by saving the right key; persisting it would keep the voice blocked afterwards.
        const keyProblem = failure.kind === 'configuration' || /invalid[^.]{0,40}(api|subscription)[^.]{0,10}key|api[_ -]?key[^.]{0,20}(invalid|missing|expired)/i.test(detail);
        if ((upstream.status === 402 || upstream.status === 403) && !keyProblem) await setAiPause(failure, pauseId);
        return Response.json({ error: encodeAiFailure(failure) }, { status: upstream.status });
      }
      if (!upstream.body) return Response.json({ error: 'Sarvam returned no audio.' }, { status: 502 });
      // Forward audio as it arrives so speech starts while Sarvam is still generating.
      return new Response(sarvamStreamEvents(upstream.body), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
    } catch (error) {
      if (isAiCancellation(error, request.signal)) return new Response(null, { status: 499 });
      return Response.json({ error: 'Sarvam speech could not finish.' }, { status: 503 });
    }
  } } },
});
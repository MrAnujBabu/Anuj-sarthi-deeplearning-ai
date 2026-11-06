import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VISION_MODEL } from '@/lib/verify';

const Body = z.object({
  image: z.string().startsWith('data:image/').max(12_000_000),
  topic: z.string().trim().min(2).max(200),
  labels: z.string().trim().max(1000).default(''),
});

const Item = z.object({ label: z.string(), status: z.enum(['correct', 'wrong', 'misspelled', 'missing', 'extra']), note: z.string().default('') });
const Result = z.object({ verdict: z.enum(['ok', 'issues']), summary: z.string(), items: z.array(Item).max(40) });

function prompt(topic: string, labels: string) {
  return `You are a strict NEET Biology/Physics/Chemistry teacher. Compare this AI-made diagram of "${topic}" with the standard NCERT (Class 11/12) figure.
${labels ? `The student asked for these labels: ${labels}.` : 'Check every label that the NCERT figure normally shows.'}
For each label in the image (and each important NCERT label that is missing), decide:
- correct: right text and pointing at the right structure
- wrong: pointing at the wrong part, or the structure drawn is wrong
- misspelled: right place but spelling is wrong/garbled
- missing: NCERT figure has it, image does not
- extra: not part of the NCERT figure / invented
Reply with ONLY JSON: {"verdict":"ok"|"issues","summary":"one short Hinglish sentence for the student","items":[{"label":"...","status":"...","note":"short Hinglish note, empty if correct"}]}`;
}

/** Auto label check: a vision model compares every Studio diagram with the NCERT figure. */
export const Route = createFileRoute('/api/studio-label-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
        const { getAiPause, setAiPause } = await import('@/lib/ai/pause.server');
        const paused = await getAiPause();
        if (paused) return Response.json({ error: paused.message || 'AI is paused.' }, { status: paused.kind === 'credits' ? 402 : 403 });
        const { gatewayChatText, GatewayError } = await import('@/lib/gateway-chat.server');
        const { classifyAiFailure } = await import('@/lib/ai/errors');
        try {
          const text = await gatewayChatText({
            model: VISION_MODEL,
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt(parsed.data.topic, parsed.data.labels) }, { type: 'image_url', image_url: { url: parsed.data.image } }] }],
          }, request.signal);
          const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
          const result = Result.safeParse(JSON.parse(json || 'null'));
          if (!result.success) return Response.json({ error: 'Label check ka jawab samajh nahi aaya.' }, { status: 502 });
          return Response.json(result.data);
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          if (e instanceof GatewayError) {
            const failure = classifyAiFailure(e.status, e.details);
            if (failure.kind === 'credits') await setAiPause(failure);
          }
          console.error('[studio-label-check] failed', e instanceof Error ? e.message : e);
          return Response.json({ error: 'Label check nahi ho paaya — NCERT figure se khud milaa lijiye.' }, { status: e instanceof GatewayError ? e.status : 500 });
        }
      },
    },
  },
});

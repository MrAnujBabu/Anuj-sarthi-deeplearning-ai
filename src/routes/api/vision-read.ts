import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VISION_MODEL } from '@/lib/verify';

const Body = z.object({
  images: z.array(z.string().startsWith('data:image/').max(6_000_000)).min(1).max(4),
});

const PROMPT = `You are reading a NEET (India) student's study photo so a tutor can solve it. Transcribe it exactly as text.
Include: the full question text, every option exactly as printed with its label, all numbers with units, chemical formulas and equations (LaTeX inside $$...$$), and any matching table or assertion-reason format.
For any diagram, graph, circuit, structure or figure, describe it precisely: labels, arrows and their directions, axes and values, connections, angles.
If something is unreadable, write [unclear: what]. Do NOT solve or hint at the answer. Output only the transcription.`;

/** Gemini reads a doubt photo before the tutor answers (photo → careful text). */
export const Route = createFileRoute('/api/vision-read')({
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
            messages: [{
              role: 'user',
              content: [{ type: 'text', text: PROMPT }, ...parsed.data.images.map((url) => ({ type: 'image_url', image_url: { url } }))],
            }],
          }, request.signal);
          const reading = text.trim().slice(0, 12000);
          if (!reading) return Response.json({ error: 'The photo could not be read.' }, { status: 422 });
          return Response.json({ text: reading, model: VISION_MODEL });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const status = e instanceof GatewayError ? e.status : 500;
          if (e instanceof GatewayError) {
            const failure = classifyAiFailure(e.status, e.details);
            if (failure.kind === 'credits') await setAiPause(failure);
          }
          console.error('[vision-read] failed', e instanceof Error ? e.message : e);
          return Response.json({ error: e instanceof Error ? e.message : 'The photo could not be read.' }, { status });
        }
      },
    },
  },
});

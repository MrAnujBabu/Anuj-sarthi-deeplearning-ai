import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const Body = z.object({
  topic: z.string().trim().min(2).max(120),
  chapter: z.string().trim().min(2).max(160),
  labels: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
});

const IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';

function diagramPrompt(topic: string, chapter: string, labels: string[]) {
  return `NCERT textbook-style line diagram for NEET Biology: "${topic}" (from ${chapter}). ` +
    `Clean black-and-white scientific illustration on white paper, neat hand-drawn textbook feel, clear outlines, no color, no photo. ` +
    (labels.length ? `Label exactly these parts with thin leader lines: ${labels.join(', ')}. ` : 'Label the 4-6 most important parts with thin leader lines. ') +
    `Labels in simple English, legible, correctly placed. No watermark, no extra text, no title.`;
}

/** Generates an NCERT-style labeled diagram; streams the gateway SSE straight through. */
export const Route = createFileRoute('/api/ncert-diagram')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
        const { getAiPause, setAiPause } = await import('@/lib/ai/pause.server');
        const paused = await getAiPause();
        if (paused) return Response.json({ error: paused.message || 'AI is paused.' }, { status: paused.kind === 'credits' ? 402 : 403 });
        const key = process.env['LOVABLE_API_KEY'];
        if (!key) return Response.json({ error: 'AI is not configured for this app.' }, { status: 401 });
        const { topic, chapter, labels } = parsed.data;
        try {
          const upstream = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
            method: 'POST',
            signal: request.signal,
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Lovable-AIG-SDK': 'fetch' },
            body: JSON.stringify({ model: IMAGE_MODEL, prompt: diagramPrompt(topic, chapter, labels), stream: true, partial_images: 1 }),
          });
          if (!upstream.ok || !upstream.body) {
            const t = await upstream.text().catch(() => '');
            if (upstream.status === 402 || upstream.status === 403) {
              const { classifyAiFailure } = await import('@/lib/ai/errors');
              const failure = classifyAiFailure(upstream.status, t);
              if (failure.kind === 'credits') await setAiPause(failure);
            }
            return Response.json({ error: `Diagram generation failed (${upstream.status}).` }, { status: upstream.status });
          }
          return new Response(upstream.body, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error('[ncert-diagram] failed', e instanceof Error ? e.message : e);
          return Response.json({ error: 'Diagram generation failed.' }, { status: 500 });
        }
      },
    },
  },
});

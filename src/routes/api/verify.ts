import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import type { CouncilEvent } from '@/lib/verify';

const Body = z.object({
  question: z.string().trim().min(1).max(12000),
  answer: z.string().trim().min(1).max(60000),
  images: z.array(z.string().startsWith('data:image/').max(6_000_000)).max(2).optional(),
  mode: z.enum(['solve', 'quiz']).optional(),
});

/** Answer-checking council (Gemini + GPT review, Claude rules). Streams NDJSON progress events. */
export const Route = createFileRoute('/api/verify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
        const { question, answer, images = [], mode } = parsed.data;
        // Never check quiz turns: the reviewers would reveal the answer before the student picks.
        if (mode === 'quiz') return Response.json({ error: 'Verify is off during quizzes.' }, { status: 400 });

        const { getAiPause } = await import('@/lib/ai/pause.server');
        const paused = await getAiPause();
        if (paused) {
          const status = paused.kind === 'credits' ? 402 : 403;
          return Response.json({ error: paused.message || 'AI is paused for this workspace.' }, { status });
        }

        const { runCouncil } = await import('@/lib/council.server');
        const enc = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const emit = (e: CouncilEvent) => {
              try { controller.enqueue(enc.encode(JSON.stringify(e) + '\n')); } catch { /* client gone */ }
            };
            try {
              await runCouncil({ question, answer, images }, request.signal, emit);
            } catch (e) {
              if (!request.signal.aborted) {
                console.error('[verify] council failed', e instanceof Error ? e.message : e);
                emit({ type: 'error', message: 'The answer check could not finish. Please try again.', status: 500 });
              }
            } finally {
              try { controller.close(); } catch { /* already closed */ }
            }
          },
        });
        return new Response(stream, {
          headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
        });
      },
    },
  },
});

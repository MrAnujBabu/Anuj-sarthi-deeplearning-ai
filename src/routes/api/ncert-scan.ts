import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const Body = z.object({
  cls: z.union([z.literal(11), z.literal(12)]),
  no: z.number().int().min(1).max(19),
});

/** NCERT Deep Scan: fetch a chapter online, extract verified topic snippets, cache them. */
export const Route = createFileRoute('/api/ncert-scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
        const { getAiPause } = await import('@/lib/ai/pause.server');
        const paused = await getAiPause();
        if (paused) return Response.json({ error: paused.message || 'AI is paused.' }, { status: paused.kind === 'credits' ? 402 : 403 });
        try {
          const { scanChapter, ScanError } = await import('@/lib/ncert-scan.server');
          const result = await scanChapter(parsed.data.cls, parsed.data.no);
          return Response.json(result);
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const { ScanError } = await import('@/lib/ncert-scan.server');
          const status = e instanceof ScanError ? e.status : 500;
          console.error('[ncert-scan] failed', e instanceof Error ? e.message : e);
          return Response.json({ error: e instanceof Error ? e.message : 'The chapter scan failed.' }, { status });
        }
      },
    },
  },
});

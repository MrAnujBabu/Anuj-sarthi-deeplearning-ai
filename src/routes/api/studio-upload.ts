import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ENHANCE_CONTAINERS, ENHANCE_MAX_BYTES } from '@/lib/studio-tools';

const Body = z.object({
  container: z.enum(ENHANCE_CONTAINERS),
  size: z.number().int().min(1).max(ENHANCE_MAX_BYTES),
});

/**
 * Temporary private upload slot for a Topaz clip (the browser uploads straight to storage).
 * DELETE ?path= removes the clip once its job has finished; old clips are swept after six hours.
 */
export const Route = createFileRoute('/api/studio-upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'MP4 / MOV video, 50 MB tak.' }, { status: 400 });
        const { createUploadSlot, studioFailure } = await import('@/lib/studio.server');
        try {
          return Response.json(await createUploadSlot(parsed.data.container));
        } catch (e) {
          const f = await studioFailure(e);
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
      DELETE: async ({ request }) => {
        const path = new URL(request.url).searchParams.get('path') ?? '';
        const { isStudioUploadPath, removeUpload } = await import('@/lib/studio.server');
        if (!isStudioUploadPath(path)) return Response.json({ error: 'Path galat hai.' }, { status: 400 });
        await removeUpload(path);
        return new Response(null, { status: 204 });
      },
    },
  },
});

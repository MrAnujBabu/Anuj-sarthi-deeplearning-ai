import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DETAILS_MAX, IMAGE_ORIENTATIONS, IMAGE_STYLES, TOPIC_MAX } from '@/lib/studio-tools';

const Body = z.object({
  style: z.enum(IMAGE_STYLES),
  topic: z.string().trim().min(2).max(TOPIC_MAX),
  details: z.string().trim().max(DETAILS_MAX).default(''),
  orientation: z.enum(Object.keys(IMAGE_ORIENTATIONS) as [keyof typeof IMAGE_ORIENTATIONS, ...(keyof typeof IMAGE_ORIENTATIONS)[]]).default('portrait'),
});

/** ByteDance Seedream: one labelled NCERT diagram or revision poster, returned as a data URL. */
export const Route = createFileRoute('/api/studio-image')({
  server: {
    handlers: {
      /** GET ?path= streams a finished picture's private 24-hour copy (after a refresh). */
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get('path') ?? '';
        const { isStudioImagePath, studioImageFile, studioFailure } = await import('@/lib/studio.server');
        if (!isStudioImagePath(path)) return Response.json({ error: 'Image ab available nahi hai (24 ghante khatam).' }, { status: 404 });
        try { return await studioImageFile(path); } catch (e) {
          const f = await studioFailure(e);
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Topic 2–160 akshar ka likhiye.' }, { status: 400 });
        const { assertAiAvailable, createStudioImage, studioFailure } = await import('@/lib/studio.server');
        try {
          await assertAiAvailable();
          return Response.json(await createStudioImage(parsed.data, request.signal));
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const f = await studioFailure(e, 'ByteDance');
          return Response.json({ error: f.message }, { status: f.status, headers: f.retryAfterSeconds ? { 'Retry-After': String(f.retryAfterSeconds) } : {} });
        }
      },
    },
  },
});

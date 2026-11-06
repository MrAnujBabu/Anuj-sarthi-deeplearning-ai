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
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: 'Topic 2–160 akshar ka likhiye.' }, { status: 400 });
        const { assertAiAvailable, createStudioImage, studioFailure } = await import('@/lib/studio.server');
        try {
          await assertAiAvailable();
          const image = await createStudioImage(parsed.data, request.signal);
          return Response.json({ image });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const f = await studioFailure(e, 'ByteDance');
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
    },
  },
});

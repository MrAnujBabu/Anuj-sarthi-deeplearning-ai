import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  ANIMATION_ASPECTS, ANIMATION_DURATIONS, DETAILS_MAX, ENHANCE_CONTAINERS, ENHANCE_MAX_SECONDS, ENHANCE_TARGETS, TOPIC_MAX,
} from '@/lib/studio-tools';

const JOB_ID = /^[A-Za-z0-9_\-:.]{4,200}$/;

const Animation = z.object({
  tool: z.literal('animation'),
  topic: z.string().trim().min(2).max(TOPIC_MAX),
  details: z.string().trim().max(DETAILS_MAX).default(''),
  duration: z.union([z.literal(ANIMATION_DURATIONS[0]), z.literal(ANIMATION_DURATIONS[1]), z.literal(ANIMATION_DURATIONS[2])]),
  resolution: z.enum(['480p', '720p']),
  aspect: z.enum(ANIMATION_ASPECTS),
});

const Enhance = z.object({
  tool: z.literal('enhance'),
  path: z.string().max(200),
  container: z.enum(ENHANCE_CONTAINERS),
  width: z.number().int().min(16).max(8192),
  height: z.number().int().min(16).max(8192),
  frameCount: z.number().int().min(1).max(500_000),
  frameRate: z.number().min(1).max(240),
  startIndex: z.number().int().min(0),
  endIndex: z.number().int().min(0),
  target: z.enum(Object.keys(ENHANCE_TARGETS) as [keyof typeof ENHANCE_TARGETS, ...(keyof typeof ENHANCE_TARGETS)[]]),
}).refine(v => v.endIndex >= v.startIndex && v.endIndex < v.frameCount, 'Clip range galat hai.')
  .refine(v => (v.endIndex - v.startIndex + 1) / v.frameRate <= ENHANCE_MAX_SECONDS + 0.5, `Clip ${ENHANCE_MAX_SECONDS} second se lamba hai.`);

/**
 * POST starts a video job (ByteDance Seedance animation or Topaz Starlight enhance);
 * GET ?id= reads its status. Results are downloaded through /api/studio-video-file.
 */
export const Route = createFileRoute('/api/studio-video')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id') ?? '';
        if (!JOB_ID.test(id)) return Response.json({ error: 'Job id galat hai.' }, { status: 400 });
        const { readStudioJob, studioFailure } = await import('@/lib/studio.server');
        try {
          return Response.json({ job: await readStudioJob(id) }, { headers: { 'Cache-Control': 'no-store' } });
        } catch (e) {
          const f = await studioFailure(e);
          return Response.json({ error: f.message }, { status: f.status, headers: f.retryAfterSeconds ? { 'Retry-After': String(f.retryAfterSeconds) } : {} });
        }
      },
      POST: async ({ request }) => {
        const json: unknown = await request.json().catch(() => null);
        const tool = json && typeof json === 'object' ? (json as { tool?: unknown }).tool : undefined;
        const server = await import('@/lib/studio.server');
        try {
          await server.assertAiAvailable();
          if (tool === 'animation') {
            const parsed = Animation.safeParse(json);
            if (!parsed.success) return Response.json({ error: 'Topic, length aur quality sahi chuniye.' }, { status: 400 });
            return Response.json({ job: await server.startAnimation(parsed.data) });
          }
          if (tool === 'enhance') {
            const parsed = Enhance.safeParse(json);
            if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Video ki jaankari galat hai.' }, { status: 400 });
            const v = parsed.data;
            if (!server.isStudioUploadPath(v.path)) return Response.json({ error: 'Upload ki hui video nahi mili.' }, { status: 400 });
            const videoUrl = await server.signedReadUrl(v.path);
            const job = await server.startEnhance({ ...v, videoUrl });
            return Response.json({ job });
          }
          return Response.json({ error: 'Tool chuniye.' }, { status: 400 });
        } catch (e) {
          const f = await server.studioFailure(e, tool === 'enhance' ? 'Topaz Labs' : 'ByteDance');
          return Response.json({ error: f.message }, { status: f.status, headers: f.retryAfterSeconds ? { 'Retry-After': String(f.retryAfterSeconds) } : {} });
        }
      },
    },
  },
});

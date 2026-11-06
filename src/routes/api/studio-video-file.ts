import { createFileRoute } from '@tanstack/react-router';

const JOB_ID = /^[A-Za-z0-9_\-:.]{4,200}$/;

/** Streams a finished Studio video (Seedance animation or Topaz result); ?download=1 saves it as a file. */
export const Route = createFileRoute('/api/studio-video-file')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get('id') ?? '';
        if (!JOB_ID.test(id)) return Response.json({ error: 'Job id galat hai.' }, { status: 400 });
        const { studioVideoFile, studioFailure } = await import('@/lib/studio.server');
        try {
          return await studioVideoFile(id, url.searchParams.get('download') === '1');
        } catch (e) {
          const f = await studioFailure(e);
          return Response.json({ error: f.status === 404 ? 'Video ab available nahi hai (time khatam).' : f.message }, { status: f.status });
        }
      },
    },
  },
});

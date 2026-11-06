import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/api/studio-telegram')({
  server: { handlers: {
    GET: async ({ request }) => {
      const token = new URL(request.url).searchParams.get('ref');
      if (!token || token.length > 2000) return Response.json({ error: 'Preview link galat hai.' }, { status: 400 });
      try {
        const { telegramStudioFile } = await import('@/lib/studio-telegram.server');
        return await telegramStudioFile(token);
      } catch { return Response.json({ error: 'Telegram preview nahi mila. Channel mein file dekh sakte hain.' }, { status: 502 }); }
    },
    POST: async ({ request }) => {
      const { authorizeBatchContext } = await import('@/lib/vedantu/context-auth.server');
      const denied = await authorizeBatchContext(request);
      if (denied) return denied;
      if (Number(request.headers.get('content-length') || 0) > 21 * 1024 * 1024) return Response.json({ error: 'File 20 MB tak chuniye.' }, { status: 413 });
      try {
        const form = await request.formData();
        const title = z.string().trim().min(1).max(160).parse(form.get('title'));
        const kind = z.enum(['image', 'video']).parse(form.get('kind'));
        const file = form.get('file');
        if (!(file instanceof Blob)) return Response.json({ error: 'Output file nahi mili.' }, { status: 400 });
        const { sendStudioToTelegram } = await import('@/lib/studio-telegram.server');
        return Response.json(await sendStudioToTelegram(file, title, kind), { headers: { 'Cache-Control': 'no-store' } });
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : 'Telegram upload confirm nahi hua. Channel check karein; generate dobara na karein.' }, { status: 502 });
      }
    },
  } },
});
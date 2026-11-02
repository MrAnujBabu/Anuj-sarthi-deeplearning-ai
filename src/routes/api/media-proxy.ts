import { createFileRoute } from '@tanstack/react-router';
import { isMediaContentType, MEDIA_EXTENSION } from '@/lib/web-video';

/**
 * Range-forwarding reader for public audio/video files whose site blocks cross-origin reads,
 * so the browser can extract speech locally. Only media responses pass; pages, scripts and
 * private addresses are refused, and every redirect hop is re-validated.
 */
async function proxy(request: Request, method: 'GET' | 'HEAD') {
  const target = new URL(request.url).searchParams.get('url') ?? '';
  const { safeFetch, BROWSER_UA, WebVideoError } = await import('@/lib/web-video.server');
  const headers: Record<string, string> = { 'User-Agent': BROWSER_UA, Accept: '*/*' };
  const range = request.headers.get('range');
  if (range && /^bytes=\d*-\d*$/.test(range)) headers['Range'] = range;
  try {
    const { response, url } = await safeFetch(target, { method, headers, signal: request.signal });
    const type = response.headers.get('content-type') ?? '';
    const allowed = isMediaContentType(type) || ((/octet-stream|binary/i.test(type) || !type) && MEDIA_EXTENSION.test(url));
    if (!allowed) { await response.body?.cancel().catch(() => {}); return Response.json({ error: 'यह media file नहीं है।' }, { status: 415 }); }
    if (!response.ok && response.status !== 206) { await response.body?.cancel().catch(() => {}); return new Response(null, { status: response.status }); }
    const out = new Headers({ 'Cache-Control': 'private, max-age=600', 'X-Content-Type-Options': 'nosniff' });
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const value = response.headers.get(name); if (value) out.set(name, value);
    }
    if (!out.has('accept-ranges')) out.set('accept-ranges', 'bytes');
    return new Response(method === 'HEAD' ? null : response.body, { status: response.status, headers: out });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof WebVideoError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Media file नहीं खुली।' }, { status: 502 });
  }
}

export const Route = createFileRoute('/api/media-proxy')({
  server: { handlers: {
    GET: ({ request }) => proxy(request, 'GET'),
    HEAD: ({ request }) => proxy(request, 'HEAD'),
  } },
});

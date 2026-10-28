import { createFileRoute } from '@tanstack/react-router';
import { parseChannelInput, type ChannelPage, type ChannelVideo } from '@/lib/youtube-channel';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const CONTEXT = { client: { clientName: 'WEB', clientVersion: '2.20251020.00.00', hl: 'en', gl: 'IN' } };
const VIDEOS_TAB = 'EgZ2aWRlb3PyBgQKAjoA';
const cache = new Map<string, { at: number; page: ChannelPage }>();
const TTL = 10 * 60 * 1000;

async function innertube(path: string, body: Record<string, unknown>, signal: AbortSignal) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/${path}?prettyPrint=false`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ context: CONTEXT, ...body }),
  });
  if (!res.ok) throw Object.assign(new Error(`YouTube did not respond (${res.status}).`), { status: 502 });
  return res.json() as Promise<unknown>;
}

async function resolveChannelId(url: string, signal: AbortSignal) {
  const j = await innertube('navigation/resolve_url', { url }, signal).catch(() => null) as { endpoint?: { browseEndpoint?: { browseId?: string } } } | null;
  const id = j?.endpoint?.browseEndpoint?.browseId;
  if (id?.startsWith('UC')) return id;
  const html = await (await fetch(url, { signal, headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })).text();
  return html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{22})/)?.[1] ?? null;
}

type Node = Record<string, unknown>;
const get = (o: unknown, ...path: (string | number)[]): unknown => path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Node)[k as string] : undefined), o);

/** Collects videos (new lockup and legacy renderer shapes) plus the next-page token. */
export function parseChannelVideos(data: unknown) {
  const videos: ChannelVideo[] = [];
  let continuation: string | null = null;
  const seen = new Set<string>();
  const walk = (o: unknown) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    const node = o as Node;
    const lockup = node['lockupViewModel'];
    if (lockup) {
      const id = String(get(lockup, 'contentId') ?? '');
      const title = String(get(lockup, 'metadata', 'lockupMetadataViewModel', 'title', 'content') ?? '');
      const rows = (get(lockup, 'metadata', 'lockupMetadataViewModel', 'metadata', 'contentMetadataViewModel', 'metadataRows') as Node[] | undefined) ?? [];
      const parts = rows.flatMap(r => ((r['metadataParts'] as Node[] | undefined) ?? []).map(p => String(get(p, 'text', 'content') ?? ''))).filter(Boolean);
      const duration = JSON.stringify(get(lockup, 'contentImage') ?? {}).match(/"text":"(\d+(?::\d{2})+)"/)?.[1] ?? '';
      if (/^[\w-]{11}$/.test(id) && title && !seen.has(id)) {
        seen.add(id);
        videos.push({ id, title, duration, views: parts.find(p => /views?$/i.test(p)) ?? '', published: parts.find(p => /ago$|streamed|premiered/i.test(p)) ?? '', thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` });
      }
      return;
    }
    const item = node['playlistVideoRenderer'];
    if (item) {
      const id = String(get(item, 'videoId') ?? '');
      if (/^[\w-]{11}$/.test(id) && !seen.has(id)) {
        seen.add(id);
        const info = ((get(item, 'videoInfo', 'runs') as Node[] | undefined) ?? []).map(r => String(r['text'] ?? '')).join('');
        videos.push({ id, title: String(get(item, 'title', 'runs', 0, 'text') ?? ''), duration: String(get(item, 'lengthText', 'simpleText') ?? ''), views: info.split('•')[0]?.trim() ?? '', published: info.split('•')[1]?.trim() ?? '', thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` });
      }
      return;
    }
    const legacy = node['videoRenderer'];
    if (legacy) {
      const id = String(get(legacy, 'videoId') ?? '');
      if (/^[\w-]{11}$/.test(id) && !seen.has(id)) {
        seen.add(id);
        videos.push({ id, title: String(get(legacy, 'title', 'runs', 0, 'text') ?? ''), duration: String(get(legacy, 'lengthText', 'simpleText') ?? ''), views: String(get(legacy, 'viewCountText', 'simpleText') ?? ''), published: String(get(legacy, 'publishedTimeText', 'simpleText') ?? ''), thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` });
      }
      return;
    }
    const token = get(node, 'continuationItemRenderer', 'continuationEndpoint', 'continuationCommand', 'token');
    if (typeof token === 'string') continuation = token;
    for (const value of Object.values(node)) walk(value);
  };
  walk(data);
  return { videos, continuation };
}

export const Route = createFileRoute('/api/youtube-channel')({
  server: { handlers: { GET: async ({ request }) => {
    const params = new URL(request.url).searchParams;
    const input = (params.get('channel') ?? '').slice(0, 300), more = (params.get('continuation') ?? '').slice(0, 4000);
    const ref = parseChannelInput(input);
    if (!ref) return Response.json({ error: 'YouTube channel / playlist का link या @handle paste करें।' }, { status: 400 });
    const key = `${input}|${more}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return Response.json(hit.page, { headers: { 'Cache-Control': 'private, max-age=300' } });
    try {
      if (ref.kind === 'playlist') {
        const data = more ? await innertube('browse', { continuation: more }, request.signal) : await innertube('browse', { browseId: `VL${ref.id}` }, request.signal);
        const { videos, continuation } = parseChannelVideos(data);
        const title = String(get(data, 'metadata', 'playlistMetadataRenderer', 'title') ?? get(data, 'header', 'pageHeaderRenderer', 'pageTitle') ?? 'Playlist');
        if (!videos.length && !more) return Response.json({ error: 'इस playlist में videos नहीं मिलीं (private हो सकती है)।' }, { status: 404 });
        const page: ChannelPage = { channel: { id: ref.id, title, avatar: videos[0]?.thumbnail ?? '' }, videos, continuation };
        cache.set(key, { at: Date.now(), page });
        return Response.json(page, { headers: { 'Cache-Control': 'private, max-age=300' } });
      }
      const id = ref.kind === 'id' ? ref.id : await resolveChannelId(ref.url, request.signal);
      if (!id) return Response.json({ error: 'यह channel नहीं मिला।' }, { status: 404 });
      const data = more ? await innertube('browse', { continuation: more }, request.signal) : await innertube('browse', { browseId: id, params: VIDEOS_TAB }, request.signal);
      const { videos, continuation } = parseChannelVideos(data);
      const meta = get(data, 'metadata', 'channelMetadataRenderer') as Node | undefined;
      const page: ChannelPage = {
        channel: { id, title: String(meta?.['title'] ?? ''), avatar: String(get(meta, 'avatar', 'thumbnails', 0, 'url') ?? '') },
        videos, continuation,
      };
      if (!videos.length && !more) return Response.json({ error: 'इस channel पर videos नहीं मिलीं।' }, { status: 404 });
      cache.set(key, { at: Date.now(), page });
      if (cache.size > 200) { const oldest = cache.keys().next().value; if (oldest !== undefined) cache.delete(oldest); }
      return Response.json(page, { headers: { 'Cache-Control': 'private, max-age=300' } });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      console.error('[youtube-channel] failed', error instanceof Error ? error.message : error);
      return Response.json({ error: 'Channel की videos अभी नहीं आ पाईं। थोड़ी देर बाद फिर कोशिश करें।' }, { status: 502 });
    }
  } } },
});

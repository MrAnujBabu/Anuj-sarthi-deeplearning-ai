// Server-only: resolves any public page or media link to a YouTube id, a playable media file and optional captions.
import { extractVideoCandidates, isMediaContentType, MEDIA_EXTENSION, publicHttpUrl, vimeoId } from './web-video';
import { parseYouTubeId } from './youtube-hindi';

export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

export class WebVideoError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}

/** Fetch that re-validates every redirect hop, so a public link can never bounce into a private address. */
export async function safeFetch(raw: string, init: RequestInit & { signal?: AbortSignal }, maxRedirects = 5): Promise<{ response: Response; url: string }> {
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = publicHttpUrl(current);
    if (!url) throw new WebVideoError('यह link public web address नहीं है।', 400);
    const response = await fetch(url.href, { ...init, redirect: 'manual' });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      await response.body?.cancel().catch(() => {});
      current = new URL(response.headers.get('location') ?? '', url).href;
      continue;
    }
    return { response, url: url.href };
  }
  throw new WebVideoError('Link बहुत बार redirect हुआ।', 422);
}

async function readText(response: Response, limit: number) {
  if (!response.body) return '';
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
    if (out.length >= limit) { await reader.cancel().catch(() => {}); break; }
  }
  return out;
}

export type ResolvedVideo =
  | { kind: 'youtube'; id: string; title: string }
  | { kind: 'media'; url: string; title: string; pageUrl: string; captionsUrl?: string };

const fileTitle = (url: string) => { try { return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '') || 'Video'; } catch { return 'Video'; } };

async function resolveVimeo(id: string, pageUrl: string, signal: AbortSignal): Promise<ResolvedVideo> {
  const { response } = await safeFetch(`https://player.vimeo.com/video/${id}/config`, { signal, headers: { 'User-Agent': BROWSER_UA, Referer: pageUrl, Accept: 'application/json' } });
  if (!response.ok) throw new WebVideoError('यह Vimeo video private है या embed की अनुमति नहीं देता। Video download करके upload करें।');
  const config = await response.json() as {
    video?: { title?: string };
    request?: { text_tracks?: { url?: string; lang?: string; kind?: string }[]; files?: { progressive?: { url?: string; width?: number }[]; hls?: { default_cdn?: string; cdns?: Record<string, { url?: string }> } } };
  };
  const files = config.request?.files;
  const progressive = (files?.progressive ?? []).filter(f => f.url).sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0]?.url;
  const hls = files?.hls?.cdns?.[files.hls.default_cdn ?? '']?.url ?? Object.values(files?.hls?.cdns ?? {})[0]?.url;
  const track = config.request?.text_tracks?.find(t => t.url);
  const media = progressive ?? hls;
  if (!media) throw new WebVideoError('Vimeo ने इस video की file नहीं दी। Video download करके upload करें।');
  const captionsUrl = track?.url ? new URL(track.url, 'https://player.vimeo.com').href : undefined;
  return { kind: 'media', url: media, title: config.video?.title ?? 'Vimeo video', pageUrl, ...(captionsUrl ? { captionsUrl } : {}) };
}

/** Resolves a page/media link. HTML pages are read up to 2 MB; media bodies are never downloaded here. */
export async function resolveWebVideo(raw: string, signal: AbortSignal): Promise<ResolvedVideo> {
  const yt = parseYouTubeId(raw);
  if (yt) return { kind: 'youtube', id: yt, title: '' };
  const start = publicHttpUrl(raw);
  if (!start) throw new WebVideoError('सही video link paste करें (https://…)।', 400);
  const vm = vimeoId(start.href);
  if (vm) return resolveVimeo(vm, start.href, signal);
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(15000)]);
  let fetched: Awaited<ReturnType<typeof safeFetch>>;
  try {
    fetched = await safeFetch(start.href, { signal: timeout, headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8' } });
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof WebVideoError) throw error;
    throw new WebVideoError('यह website खुल नहीं पाई। Link जाँचें या video download करके upload करें।');
  }
  const { response, url } = fetched;
  const type = response.headers.get('content-type');
  if (isMediaContentType(type) || (MEDIA_EXTENSION.test(url) && /octet-stream/i.test(type ?? ''))) {
    await response.body?.cancel().catch(() => {});
    return { kind: 'media', url, title: fileTitle(url), pageUrl: url };
  }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new WebVideoError(`Website ने page नहीं दिया (${response.status})। Login वाले page नहीं खुलते — video download करके upload करें।`); }
  if (!/html|xml/i.test(type ?? '')) { await response.body?.cancel().catch(() => {}); throw new WebVideoError('इस link पर video या web page नहीं मिला।'); }
  const html = await readText(response, 2_000_000);
  const { title, candidates } = extractVideoCandidates(html, url);
  const media = candidates.find(c => c.kind === 'media');
  const captions = candidates.find(c => c.kind === 'captions');
  if (media && media.kind === 'media') return { kind: 'media', url: media.url, title: title || fileTitle(media.url), pageUrl: url, ...(captions?.kind === 'captions' ? { captionsUrl: captions.url } : {}) };
  const embed = candidates.find(c => c.kind === 'youtube' || c.kind === 'vimeo');
  if (embed?.kind === 'youtube') return { kind: 'youtube', id: embed.id, title };
  if (embed?.kind === 'vimeo') return resolveVimeo(embed.id, url, signal);
  throw new WebVideoError('इस page पर कोई चलने लायक video नहीं मिली (कई sites login या app में ही video दिखाती हैं)। Video download करके "File" से upload करें या transcript paste करें।');
}

/** Downloads a small subtitle file (VTT/SRT) found next to web media. */
export async function fetchCaptionsText(raw: string, signal: AbortSignal) {
  const { response } = await safeFetch(raw, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), headers: { 'User-Agent': BROWSER_UA } });
  if (!response.ok) throw new WebVideoError('Subtitles नहीं मिले।');
  return readText(response, 1_500_000);
}

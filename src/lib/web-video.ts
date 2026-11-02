// Browser-safe helpers for finding a playable video on any public web page.
import { parseYouTubeId } from './youtube-hindi';

export const MEDIA_EXTENSION = /\.(mp4|m4v|mov|webm|mkv|ogv|ogg|mp3|m4a|aac|wav|flac|opus|oga|m3u8)(?:$|[?#])/i;

export function isMediaContentType(type: string | null | undefined) {
  const t = (type ?? '').toLowerCase();
  return t.startsWith('video/') || t.startsWith('audio/') || t.includes('mpegurl');
}

function privateIPv4(host: string) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

/** Only public http(s) addresses on default ports; blocks local, private and credentialed URLs. */
export function publicHttpUrl(raw: string): URL | null {
  let url: URL;
  try { url = new URL(raw.trim().match(/^https?:\/\//i) ? raw.trim() : `https://${raw.trim()}`); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443')) return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') && !host.includes(':')) return null;
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home|corp)$/.test(host)) return null;
  if (privateIPv4(host)) return null;
  if (host.includes(':')) {
    // IPv6 literal: block loopback, unspecified, link-local, unique-local and IPv4-mapped private ranges.
    if (host === '::' || host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return null;
    const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mapped && privateIPv4(mapped)) return null;
  }
  return url;
}

export type VideoCandidate =
  | { kind: 'media'; url: string; type?: string }
  | { kind: 'captions'; url: string; lang?: string }
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string };

const decodeAttr = (value: string) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, '/').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function attrs(tag: string) {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[(m[1] ?? '').toLowerCase()] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}

export function vimeoId(raw: string) {
  try {
    const url = new URL(raw, 'https://vimeo.com');
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    return url.pathname.match(/(?:^|\/)(?:video\/)?(\d{6,12})(?:$|\/)/)?.[1] ?? null;
  } catch { return null; }
}

function absolute(value: string, base: string) {
  try { const url = new URL(value.replace(/\\\//g, '/'), base); return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null; } catch { return null; }
}

function walkJson(value: unknown, visit: (key: string, v: string) => void) {
  if (Array.isArray(value)) { value.forEach(v => walkJson(v, visit)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) { if (typeof v === 'string') visit(k, v); else walkJson(v, visit); }
}

/** Finds playable media, captions and embedded players in page HTML, best candidates first. */
export function extractVideoCandidates(html: string, baseUrl: string): { title: string; candidates: VideoCandidate[] } {
  const media: VideoCandidate[] = [], captions: VideoCandidate[] = [], embeds: VideoCandidate[] = [], loose: VideoCandidate[] = [];
  const seen = new Set<string>();
  const addMedia = (list: VideoCandidate[], value: string | undefined, type?: string) => {
    if (!value) return;
    const url = absolute(value, baseUrl); if (!url) return;
    const yt = parseYouTubeId(url); if (yt) { addEmbed({ kind: 'youtube', id: yt }); return; }
    const vm = vimeoId(url); if (vm && !MEDIA_EXTENSION.test(url)) { addEmbed({ kind: 'vimeo', id: vm }); return; }
    if (!MEDIA_EXTENSION.test(url) && !isMediaContentType(type) && list === loose) return;
    if (seen.has(url)) return; seen.add(url);
    list.push(type ? { kind: 'media', url, type } : { kind: 'media', url });
  };
  const addEmbed = (c: Extract<VideoCandidate, { kind: 'youtube' | 'vimeo' }>) => {
    const key = `${c.kind}:${c.id}`; if (seen.has(key)) return; seen.add(key); embeds.push(c);
  };
  let title = '';
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]); const key = (a['property'] ?? a['name'] ?? '').toLowerCase(); const content = a['content'];
    if (!content) continue;
    if (key === 'og:title' && !title) title = content;
    if (['og:video:secure_url', 'og:video:url', 'og:video', 'twitter:player:stream', 'og:audio', 'og:audio:secure_url'].includes(key)) addMedia(media, content, MEDIA_EXTENSION.test(content) ? undefined : 'video/');
    if (key === 'twitter:player') { const yt = parseYouTubeId(content); if (yt) addEmbed({ kind: 'youtube', id: yt }); const vm = vimeoId(content); if (vm) addEmbed({ kind: 'vimeo', id: vm }); }
  }
  if (!title) title = decodeAttr(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ') ?? '');
  for (const m of html.matchAll(/<(video|audio|source)\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    addMedia(media, a['src'] ?? a['data-src'], a['type'] || (m[1]?.toLowerCase() === 'audio' ? 'audio/' : 'video/'));
  }
  for (const m of html.matchAll(/<track\b[^>]*>/gi)) {
    const a = attrs(m[0]); const kind = (a['kind'] ?? 'subtitles').toLowerCase();
    const url = a['src'] ? absolute(a['src'], baseUrl) : null;
    if (url && (kind === 'subtitles' || kind === 'captions') && !seen.has(url)) { seen.add(url); captions.push(a['srclang'] ? { kind: 'captions', url, lang: a['srclang'] } : { kind: 'captions', url }); }
  }
  for (const m of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const src = attrs(m[0])['src'] ?? attrs(m[0])['data-src'];
    if (!src) continue;
    const url = absolute(src, baseUrl); if (!url) continue;
    const yt = parseYouTubeId(url); if (yt) addEmbed({ kind: 'youtube', id: yt });
    const vm = vimeoId(url); if (vm) addEmbed({ kind: 'vimeo', id: vm });
  }
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walkJson(JSON.parse(m[1] ?? ''), (key, value) => {
        if (key === 'contentUrl') addMedia(media, value, MEDIA_EXTENSION.test(value) ? undefined : 'video/');
        if (key === 'embedUrl') { const yt = parseYouTubeId(value); if (yt) addEmbed({ kind: 'youtube', id: yt }); const vm = vimeoId(value); if (vm) addEmbed({ kind: 'vimeo', id: vm }); }
      });
    } catch { /* invalid JSON-LD */ }
  }
  for (const m of html.matchAll(/(?:https?:)?\\?\/\\?\/(?:www\.)?(?:youtube\.com\\?\/(?:embed|watch\?v=|shorts)\\?\/?|youtu\.be\\?\/)([\w-]{11})/g)) addEmbed({ kind: 'youtube', id: m[1] ?? '' });
  for (const m of html.matchAll(/https?:\\?\/\\?\/[^\s"'<>()]+?\.(?:mp4|m4v|webm|m3u8|mp3|m4a)(?:\?[^\s"'<>()\\]*)?(?=["'\s<>()\\])/gi)) addMedia(loose, m[0].replace(/\\\//g, '/'));
  return { title, candidates: [...media, ...captions, ...embeds, ...loose] };
}

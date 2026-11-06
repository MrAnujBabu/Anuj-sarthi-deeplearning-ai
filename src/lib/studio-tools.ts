import { useDeviceBoolean } from './quiz-label-preference';

/**
 * AI Studio catalog — browser-safe. Each tool is a device on/off switch (default ON).
 * Prices are Lovable credits from the gateway catalog; keep them in sync with listModels().
 */
export type StudioToolId = 'diagram' | 'animation' | 'enhance';

export const STUDIO_TOOLS: Record<StudioToolId, {
  id: StudioToolId; label: string; vendor: string; model: string; hint: string; storageKey: string; event: string;
}> = {
  diagram: {
    id: 'diagram', label: 'Diagram & Poster', vendor: 'ByteDance Seedream 5 Pro', model: 'bytedance/seedream-5-pro',
    hint: 'Labelled NCERT diagram ya ek-page revision poster', storageKey: 'snapsolve.studio.diagram', event: 'snapsolve:studio-diagram',
  },
  animation: {
    id: 'animation', label: 'Concept Animation', vendor: 'ByteDance Seedance 2.5', model: 'bytedance/seedance-2.5',
    hint: 'Kisi process ki chhoti animated video', storageKey: 'snapsolve.studio.animation', event: 'snapsolve:studio-animation',
  },
  enhance: {
    id: 'enhance', label: 'Video saaf karo', vendor: 'Topaz Starlight', model: 'topazlabs/starlight-fast-2',
    hint: 'Dhundhli class recording ko 1080p / 4K mein saaf', storageKey: 'snapsolve.studio.enhance', event: 'snapsolve:studio-enhance',
  },
};

export const STUDIO_TOOL_IDS = Object.keys(STUDIO_TOOLS) as StudioToolId[];

export function useStudioTool(id: StudioToolId) {
  const t = STUDIO_TOOLS[id];
  return useDeviceBoolean(t.storageKey, t.event, true);
}

/** All three switches at once (hooks always called in the same order). */
export function useStudioToolSwitches() {
  const diagram = useStudioTool('diagram');
  const animation = useStudioTool('animation');
  const enhance = useStudioTool('enhance');
  return { diagram, animation, enhance } as const;
}

export function enabledStudioTools(flags: Record<StudioToolId, boolean>): StudioToolId[] {
  return STUDIO_TOOL_IDS.filter(id => flags[id]);
}

/** A short Studio topic from a tutor answer: its first heading, else its first sentence (markdown stripped). */
export function studioTopicFrom(text: string, max = 100) {
  const clean = text
    .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ');
  const heading = clean.match(/^\s{0,3}#{1,6}\s+(.+)$/m)?.[1];
  const firstLine = clean.split('\n').map(l => l.trim()).find(l => /[\p{L}\p{N}]/u.test(l)) ?? '';
  const pick = heading ?? firstLine.split(/(?<=[.?!।])\s/)[0] ?? '';
  const plain = pick.replace(/[*_`>#[\]]/g, '').replace(/\(([^)]*)\)\s*$/, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

// ---------- Prices (Lovable credits) ----------
export const SEEDREAM_IMAGE_CREDITS = 0.18;
export const SEEDANCE_CREDITS_PER_SECOND = { '480p': 0.4112, '720p': 0.9248 } as const;
export type AnimationResolution = keyof typeof SEEDANCE_CREDITS_PER_SECOND;
export const ANIMATION_DURATIONS = [5, 8, 10] as const;
export type AnimationDuration = (typeof ANIMATION_DURATIONS)[number];
export const ANIMATION_ASPECTS = ['16:9', '9:16', '1:1'] as const;
export type AnimationAspect = (typeof ANIMATION_ASPECTS)[number];

export function animationCost(seconds: number, resolution: AnimationResolution) {
  return Math.round(seconds * SEEDANCE_CREDITS_PER_SECOND[resolution] * 100) / 100;
}

export function formatCredits(credits: number) {
  return `${credits.toFixed(2)} credits`;
}

// ---------- Image styles ----------
export const IMAGE_STYLES = ['diagram', 'poster'] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];
export const IMAGE_ORIENTATIONS = { square: '2048x2048', portrait: '1728x2304', landscape: '2304x1728' } as const;
export type ImageOrientation = keyof typeof IMAGE_ORIENTATIONS;

export const TOPIC_MAX = 160;
export const DETAILS_MAX = 400;

export function studioImagePrompt(style: ImageStyle, topic: string, details: string) {
  const extra = details.trim() ? ` Include: ${details.trim()}.` : '';
  if (style === 'diagram') {
    return `NCERT textbook-style labelled scientific diagram for NEET students: "${topic.trim()}". ` +
      'Clean, accurate line illustration with soft flat colours on a plain white background, like a Class 11-12 NCERT figure. ' +
      'Label the important parts with thin straight leader lines and short, correctly spelled English labels in a clear sans-serif font. ' +
      `Scientifically correct structure and proportions.${extra} No watermark, no decorative border, no extra paragraphs of text.`;
  }
  return `One-page revision poster for a NEET student on "${topic.trim()}". ` +
    'Clean infographic layout on an off-white background: a bold title at the top, 5-7 short key points with small icons, ' +
    'one small labelled diagram, and a "Yaad rakho" exam-tip box at the bottom. ' +
    `Correctly spelled English text, high contrast, large readable font, NCERT-accurate facts.${extra} No watermark, no clutter.`;
}

export function studioAnimationPrompt(topic: string, details: string) {
  const extra = details.trim() ? ` Show: ${details.trim()}.` : '';
  return `Short educational 3D animation for NEET biology/physics/chemistry students explaining "${topic.trim()}". ` +
    'Scientifically accurate, clean soft-lit background, smooth slow camera, clear step-by-step motion of the process, ' +
    `textbook colours, calm pace.${extra} No on-screen text, no captions, no people talking, no logos.`;
}

// ---------- Topaz enhance (Starlight) ----------
export const ENHANCE_MAX_BYTES = 50 * 1024 * 1024;
export const ENHANCE_MAX_SECONDS = 20;
export const ENHANCE_TARGETS = { '1080p': '1920x1080', '4k': '3840x2160' } as const;
export type EnhanceTarget = keyof typeof ENHANCE_TARGETS;
export const ENHANCE_CONTAINERS = ['mp4', 'mov', 'm4v'] as const;
export type EnhanceContainer = (typeof ENHANCE_CONTAINERS)[number];

export type VideoProbe = {
  container: EnhanceContainer;
  width: number;
  height: number;
  frameCount: number;
  frameRate: number;
  durationSeconds: number;
};

/** Frame window for a clip: start second + length, clamped to the source and the max length. */
export function clipFrames(probe: Pick<VideoProbe, 'frameCount' | 'frameRate'>, startSeconds: number, lengthSeconds: number) {
  const fps = probe.frameRate;
  const len = Math.min(Math.max(lengthSeconds, 1 / fps), ENHANCE_MAX_SECONDS);
  const start = Math.min(Math.max(0, Math.round(startSeconds * fps)), probe.frameCount - 1);
  const end = Math.min(probe.frameCount - 1, start + Math.max(1, Math.round(len * fps)) - 1);
  return { start_index: start, end_index: end, frames: end - start + 1, seconds: (end - start + 1) / fps };
}

export function containerFromName(name: string): EnhanceContainer | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return (ENHANCE_CONTAINERS as readonly string[]).includes(ext) ? ext as EnhanceContainer : null;
}

/**
 * Reads width, height, frame count and frame rate of the first video track from an
 * MP4/MOV file (ISO BMFF boxes: moov › trak › tkhd/mdhd/stts). Returns null when the
 * file has no readable video track.
 */
export function probeIsoVideo(buffer: ArrayBuffer, container: EnhanceContainer): VideoProbe | null {
  const view = new DataView(buffer);
  const type = (at: number) => String.fromCharCode(view.getUint8(at + 4), view.getUint8(at + 5), view.getUint8(at + 6), view.getUint8(at + 7));
  type Box = { type: string; start: number; body: number; end: number };
  const boxes = (from: number, to: number): Box[] => {
    const out: Box[] = [];
    let at = from;
    while (at + 8 <= to) {
      let size = view.getUint32(at);
      let header = 8;
      if (size === 1) { if (at + 16 > to) break; size = Number(view.getBigUint64(at + 8)); header = 16; }
      else if (size === 0) size = to - at;
      if (size < header || at + size > to) break;
      out.push({ type: type(at), start: at, body: at + header, end: at + size });
      at += size;
    }
    return out;
  };
  const child = (box: Box, name: string) => boxes(box.body, box.end).find(b => b.type === name);
  try {
    const moov = boxes(0, buffer.byteLength).find(b => b.type === 'moov');
    if (!moov) return null;
    for (const trak of boxes(moov.body, moov.end).filter(b => b.type === 'trak')) {
      const mdia = child(trak, 'mdia');
      const hdlr = mdia && child(mdia, 'hdlr');
      if (!mdia || !hdlr || type(hdlr.body + 4) !== 'vide') continue;
      const mdhd = child(mdia, 'mdhd');
      const tkhd = child(trak, 'tkhd');
      const minf = child(mdia, 'minf');
      const stbl = minf && child(minf, 'stbl');
      const stts = stbl && child(stbl, 'stts');
      if (!mdhd || !tkhd || !stts) continue;
      const mdhdV1 = view.getUint8(mdhd.body) === 1;
      const timescale = view.getUint32(mdhd.body + (mdhdV1 ? 20 : 12));
      const duration = mdhdV1 ? Number(view.getBigUint64(mdhd.body + 24)) : view.getUint32(mdhd.body + 16);
      const tkhdV1 = view.getUint8(tkhd.body) === 1;
      const dims = tkhd.body + (tkhdV1 ? 88 : 76);
      const width = Math.round(view.getUint32(dims) / 65536);
      const height = Math.round(view.getUint32(dims + 4) / 65536);
      const entries = view.getUint32(stts.body + 4);
      let frameCount = 0;
      for (let i = 0; i < entries; i++) frameCount += view.getUint32(stts.body + 8 + i * 8);
      if (!timescale || !duration || !frameCount || !width || !height) continue;
      const durationSeconds = duration / timescale;
      const frameRate = Math.round((frameCount / durationSeconds) * 1000) / 1000;
      return { container, width, height, frameCount, frameRate, durationSeconds };
    }
  } catch {
    return null;
  }
  return null;
}

// ---------- Video jobs (shared by server and browser) ----------
export type StudioJob = {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  expiresAt: number | null;
  billedCredits: number | null;
  error: string | null;
};

export function parseStudioJob(raw: unknown): StudioJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const status = r['status'];
  if (typeof r['id'] !== 'string' || (status !== 'queued' && status !== 'in_progress' && status !== 'completed' && status !== 'failed')) return null;
  const err = r['error'] as { message?: unknown } | undefined;
  const expires = typeof r['expires_at'] === 'number' ? r['expires_at'] : null;
  const billed = typeof r['lovable_billed_milli_credits'] === 'number' ? r['lovable_billed_milli_credits'] / 1000 : null;
  return {
    id: r['id'],
    status,
    progress: typeof r['progress'] === 'number' ? Math.max(0, Math.min(100, r['progress'])) : 0,
    // Gateway timestamps are seconds since epoch.
    expiresAt: expires === null ? null : expires < 1e12 ? expires * 1000 : expires,
    billedCredits: billed,
    error: err && typeof err.message === 'string' ? err.message : null,
  };
}

import { createFileRoute } from '@tanstack/react-router';
import {
  parseYouTubeId, timedTextCues, MAX_TRANSCRIPT_CHARS, MAX_TIMED_CHARS, MAX_TIMED_SEGMENTS, MAX_MEDIA_SECONDS, type TimedSegment,
} from '@/lib/youtube-hindi';
import { assembleHindiDub } from '@/lib/youtube-conversion';
import { canTryYouTubeListening, isYouTubeRestricted } from '@/lib/youtube-access';
import { interpretationIdentity, matchingResume, INTERPRET_PIPELINE } from '@/lib/interpret-identity';
import { capSegments, chunkProse, groupCues, parsePastedTranscript, parseSubtitleFile, pickCaptionTrack, type CaptionTrack } from '@/lib/transcript-cues';
import { DEFAULT_INTERPRETER, interpreterInfo, isInterpreterId, LISTENER, type InterpreterId } from '@/lib/interpreter-models';
import { encodeEvent, type InterpretBrief, type InterpretEvent, type InterpretResult, type SourceInfo, type SourceOrigin } from '@/lib/interpret-protocol';

type Send = (event: InterpretEvent) => void;
type Body = { url?: unknown; transcript?: unknown; engine?: unknown; deepListen?: unknown; quality?: unknown; segments?: unknown; title?: unknown; language?: unknown; source?: unknown; resume?: unknown };

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Timed segments heard in the browser-uploaded media path, validated and bounded. */
function validSegments(value: unknown): TimedSegment[] | null {
  if (!Array.isArray(value) || !value.length || value.length > MAX_TIMED_SEGMENTS) return null;
  const out: TimedSegment[] = [];
  for (const item of value) {
    const s = item as Partial<TimedSegment>;
    if (!s || !Number.isFinite(s.start) || !Number.isFinite(s.end) || typeof s.text !== 'string') return null;
    const start = Math.max(0, Number(s.start)), end = Math.max(start, Number(s.end));
    const t = s.text.replace(/\s+/g, ' ').trim().slice(0, 6000);
    if (t) out.push({ start, end, text: t });
  }
  return out.length ? out.sort((a, b) => a.start - b.start) : null;
}

function validSource(value: unknown): Partial<SourceInfo> {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const kind = v['kind'] === 'upload' || v['kind'] === 'web' ? v['kind'] : undefined;
  const httpUrl = (u: unknown) => { const s = text(u, 2000); return /^https?:\/\//i.test(s) ? s : undefined; };
  const mediaUrl = httpUrl(v['mediaUrl']), pageUrl = httpUrl(v['pageUrl']), fileName = text(v['fileName'], 200) || undefined;
  return { ...(kind ? { kind } : {}), ...(mediaUrl ? { mediaUrl } : {}), ...(pageUrl ? { pageUrl } : {}), ...(fileName ? { fileName } : {}) };
}

/** Saved progress from an interrupted run: Hindi lines aligned to the segments, plus the earlier brief. Ignored unless it matches. */
type PlayerInfo = { title: string; lengthSeconds: number; tracks: CaptionTrack[]; status: string; reason: string };

async function fetchYouTube(id: string, signal: AbortSignal): Promise<PlayerInfo> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
    body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en' } }, videoId: id }),
  });
  if (!res.ok) return { title: '', lengthSeconds: 0, tracks: [], status: 'ERROR', reason: `YouTube did not respond (${res.status}).` };
  const j = await res.json() as {
    videoDetails?: { title?: string; lengthSeconds?: string };
    playabilityStatus?: { status?: string; reason?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  };
  return {
    title: j.videoDetails?.title ?? '', lengthSeconds: Number(j.videoDetails?.lengthSeconds) || 0,
    tracks: j.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [],
    status: j.playabilityStatus?.status ?? 'OK', reason: j.playabilityStatus?.reason ?? '',
  };
}

async function run(body: Body, engine: InterpreterId, signal: AbortSignal, send: Send) {
  const [{ InterpretError, makeBrief, normalizeBrief, interpretTimed, interpretProse, listenYouTube }, { resolveWebVideo, fetchCaptionsText }] = await Promise.all([
    import('@/lib/interpreter.server'), import('@/lib/web-video.server'),
  ]);
  const pasted = text(body.transcript, 400_000), url = text(body.url, 2000);
  let title = text(body.title, 300), language = text(body.language, 12).toLowerCase();
  let timed: TimedSegment[] = [], prose = '', origin: SourceOrigin = 'pasted', videoId: string | null = null, truncated = false;
  let source: SourceInfo = { kind: 'text', origin: 'pasted' };
  send({ type: 'stage', stage: 'source', message: 'Video का स्रोत पढ़ रहा हूँ…' });

  const heardSegments = validSegments(body.segments);
  if (heardSegments) {
    timed = heardSegments; origin = 'listened';
    const s = validSource(body.source);
    source = { kind: s.kind ?? 'upload', origin, ...(s.mediaUrl ? { mediaUrl: s.mediaUrl } : {}), ...(s.pageUrl ? { pageUrl: s.pageUrl } : {}), ...(s.fileName ? { fileName: s.fileName } : {}) };
  } else if (pasted) {
    const cues = parsePastedTranscript(pasted);
    videoId = url ? parseYouTubeId(url) : null;
    if (cues.length) { timed = groupCues(cues, 30); origin = /-->/.test(pasted) ? 'subtitles' : 'pasted'; }
    else prose = pasted;
    if (videoId && !title) title = (await fetchYouTube(videoId, signal).catch(() => null))?.title ?? '';
    source = { kind: videoId ? 'youtube' : 'text', origin };
  } else if (url) {
    let id = parseYouTubeId(url);
    let kind: SourceInfo['kind'] = id ? 'youtube' : 'web';
    if (!id) {
      const resolved = await resolveWebVideo(url, signal);
      if (resolved.kind === 'youtube') { id = resolved.id; title = resolved.title; }
      else {
        title = resolved.title;
        if (resolved.captionsUrl) {
          try {
            const cues = parseSubtitleFile(await fetchCaptionsText(resolved.captionsUrl, signal));
            if (cues.length) { timed = groupCues(cues, 30); origin = 'subtitles'; source = { kind: 'web', origin, mediaUrl: resolved.url, pageUrl: resolved.pageUrl }; }
          } catch (error) { if (signal.aborted) throw error; /* listen to the audio instead */ }
        }
        if (!timed.length) { send({ type: 'media', mediaUrl: resolved.url, title: resolved.title, pageUrl: resolved.pageUrl }); return; }
      }
    }
    if (id) {
      videoId = id;
      const yt = await fetchYouTube(id, signal);
      if (isYouTubeRestricted(yt)) throw new InterpretError('यह YouTube video private, हटाई गई या प्रतिबंधित है।', 422);
      title = yt.title || title;
      const picked = body.deepListen === true ? null : pickCaptionTrack(yt.tracks);
      if (picked) {
        try {
          const captions = await fetch(picked.track.baseUrl, { signal });
          if (!captions.ok) throw new Error(`YouTube captions unavailable (${captions.status}).`);
          const xml = await captions.text();
          timed = groupCues(timedTextCues(xml), 30);
          origin = picked.automatic ? 'auto-captions' : 'captions';
          language = picked.track.languageCode.toLowerCase();
        } catch (error) { if (signal.aborted) throw error; timed = []; }
      }
      if (!timed.length) {
        if (!canTryYouTubeListening(yt)) throw new InterpretError('यह YouTube video उपलब्ध नहीं है (private, हटाई गई या उम्र-प्रतिबंधित)। अपनी उपलब्ध video/audio file दें या transcript जोड़ें।', 422);
        send({ type: 'stage', stage: 'listen', message: `${LISTENER.name} पूरी video सुन रहा है…` });
        const maxSeconds = Math.min(yt.lengthSeconds || MAX_MEDIA_SECONDS, MAX_MEDIA_SECONDS);
        if (yt.lengthSeconds) send({ type: 'listen', reached: 0, total: Math.min(yt.lengthSeconds, MAX_MEDIA_SECONDS) });
        const heard = await listenYouTube(id, maxSeconds, signal, reached => send({ type: 'listen', reached, ...(yt.lengthSeconds ? { total: Math.min(yt.lengthSeconds, MAX_MEDIA_SECONDS) } : {}) }));
        timed = groupCues(heard.cues, 30); origin = 'listened'; language = heard.language || language;
        truncated ||= heard.truncated === true;
        if (yt.lengthSeconds > MAX_MEDIA_SECONDS) truncated = true;
      }
      source = { kind, origin, ...(language ? { language } : {}), ...(kind === 'web' ? { pageUrl: url } : {}) };
      kind = 'youtube';
    }
  } else {
    throw new InterpretError('पहले video link, file या transcript दें।', 400);
  }

  if (timed.length) {
    const overSegments = timed.length > MAX_TIMED_SEGMENTS;
    const capped = capSegments(timed.slice(0, MAX_TIMED_SEGMENTS), MAX_TIMED_CHARS);
    timed = capped.segments; truncated ||= capped.truncated || overSegments;
  }
  else { truncated ||= prose.length > MAX_TRANSCRIPT_CHARS; prose = prose.slice(0, MAX_TRANSCRIPT_CHARS); }
  const sourceText = timed.length ? timed.map(s => s.text).join(' ') : prose;
  if (!sourceText.trim()) throw new InterpretError('Transcript खाली है — दूसरी video आज़माएँ या transcript paste करें।', 422);
  if (language) source.language = language;
  const chunks = timed.length ? [] : chunkProse(prose, 2500);
  const review = body.quality !== false;
  const sourceKey = await interpretationIdentity(timed, language, JSON.stringify([url, source, prose]), engine, review, body.deepListen === true);
  send({ type: 'source', title, language, origin, segments: timed.length || chunks.length, duration: timed.at(-1)?.end ?? 0, truncated, videoId, sourceKey, ...(timed.length ? { timeline: timed } : {}) });

  const resume = matchingResume(body.resume, timed.length, sourceKey);
  const savedBrief = resume ? normalizeBrief(resume.brief) : null;
  let brief: InterpretBrief | null, briefModel: string | undefined;
  if (savedBrief) {
    send({ type: 'stage', stage: 'brief', message: 'पिछली बार का शब्द-कोश वापस लिया — बचे हुए हिस्सों से शुरू कर रहा हूँ…' });
    brief = savedBrief; briefModel = resume?.briefModel || undefined;
  } else {
    send({ type: 'stage', stage: 'brief', message: 'GPT-6 Astra विषय, ज़रूरी शब्द और caption की गलतियाँ पहचान रहा है…' });
    ({ brief, model: briefModel } = await makeBrief(title, sourceText, signal));
  }
  send({ type: 'brief', brief, ...(briefModel ? { model: briefModel } : {}) });

  send({ type: 'stage', stage: 'interpret', message: `${interpreterInfo(engine).name} सरल Hindi बना रहा है${review ? ', दूसरा premium model हर हिस्सा जाँच रहा है' : ''}…` });
  const context = { title, language, brief };
  const panel = { ...(origin === 'listened' ? { listener: LISTENER.name } : {}), ...(briefModel ? { terminologist: briefModel } : {}) };
  let result: InterpretResult;
  if (timed.length) {
    let done = 0;
    const { lines, interpreters, quality } = await interpretTimed({
      segments: timed, context, engine, signal, review, ...(resume ? { saved: resume.lines } : {}),
      onSegment: (index, hindi) => {
        const seg = timed[index]; done++;
        if (seg) send({ type: 'segment', index, start: seg.start, end: seg.end, hindi, original: seg.text });
        send({ type: 'progress', done, total: timed.length });
      },
    });
    const { dub, hindi } = assembleHindiDub(timed, lines);
    result = { title, hindi, truncated, videoId, dub, sourceChars: sourceText.length, source, brief, panel: { ...panel, interpreters, ...qualityPanel(quality) }, original: timed.map(s => s.text), engine };
  } else {
    let done = 0;
    const { lines, interpreters, quality } = await interpretProse({ chunks, context, engine, signal, review, onChunk: () => { done++; send({ type: 'progress', done, total: chunks.length }); } });
    result = { title, hindi: lines.join('\n\n'), truncated, videoId, sourceChars: sourceText.length, source, brief, panel: { ...panel, interpreters, ...qualityPanel(quality) }, engine };
  }
  result = { ...result, pipeline: INTERPRET_PIPELINE, sourceKey, deepListen: body.deepListen === true,
    panel: { interpreters: [], ...result.panel, reviewRequested: review, reviewTotal: timed.length || chunks.length, reviewed: result.panel?.reviewed ?? 0 } };
  send({ type: 'quality', reviewed: result.panel?.reviewed ?? 0, corrected: result.panel?.corrected ?? 0 });
  send({ type: 'done', result });
}

function qualityPanel(q: { reviewers: string[]; reviewed: number; corrected: number }) {
  return q.reviewed ? { reviewers: q.reviewers, reviewed: q.reviewed, corrected: q.corrected } : {};
}

export const Route = createFileRoute('/api/youtube-hindi')({
  server: { handlers: { POST: async ({ request }) => {
    let body: Body;
    try { body = await request.json() as Body; } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return Response.json({ error: 'Bad request.' }, { status: 400 });
    const engine = isInterpreterId(body.engine) ? body.engine : DEFAULT_INTERPRETER;
    const { getAiPause, noteAiSuccess, setAiPause } = await import('@/lib/ai/pause.server');
    const paused = await getAiPause();
    if (paused?.kind === 'credits') return Response.json({ error: 'AI credits खत्म हो गए हैं — workspace में credits जोड़कर फिर चलाएँ।' }, { status: 402 });
    const signal = request.signal;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send: Send = event => { if (!open) return; try { controller.enqueue(encoder.encode(encodeEvent(event))); } catch { open = false; } };
        try {
          await run(body, engine, signal, send);
          void noteAiSuccess();
        } catch (error) {
          if (!signal.aborted) {
            const [{ describeFailure }, { WebVideoError }] = await Promise.all([import('@/lib/interpreter.server'), import('@/lib/web-video.server')]);
            const failure = error instanceof WebVideoError ? { status: error.status, message: error.message } : describeFailure(error);
            if (failure.status === 402) await setAiPause({ kind: 'credits', status: 402, message: 'AI credits are unavailable. Restore workspace credits to continue.' }).catch(() => {});
            if (failure.status >= 500) console.error('[youtube-hindi] failed', error instanceof Error ? error.message : error);
            const needTranscript = error instanceof WebVideoError || failure.status === 422;
            send({ type: 'error', error: failure.message, status: failure.status, ...(needTranscript ? { needTranscript } : {}) });
          }
        } finally {
          open = false;
          try { controller.close(); } catch { /* client gone */ }
        }
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  } } },
});

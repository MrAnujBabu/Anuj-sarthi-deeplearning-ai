import { createFileRoute } from "@tanstack/react-router";
import { resolveSpeechVoice } from '@/lib/speech-voice';
import { classifyAiFailure, encodeAiFailure } from '@/lib/ai/errors';
import { getCurrentAiPause, setAiPause } from '@/lib/ai/pause.server';

const MODEL = "google/gemini-2.5-flash-tts";
const MAX_CHARS = 1500;
const VOICES = { female: "Kore", male: "Charon" };

/**
 * A short director line keeps Gemini TTS on the Indian-teacher accent. Long
 * steering text made it sometimes speak for a minute on a two-second sentence.
 */
export function indianTeacherPrompt(text: string) {
  return `Say in a warm, clear Indian teacher's voice, in natural Hindi/Hinglish, at a conversational classroom pace:\n${text}`;
}

export const Route = createFileRoute("/api/speech")({
  server: { handlers: { POST: async ({ request }) => {
    try {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return Response.json({ error: "Voice is not configured." }, { status: 503 });
    let body: { text?: unknown; voice?: unknown } | null;
    try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
    if (!body || typeof body !== "object") return Response.json({ error: "Bad request." }, { status: 400 });
    const text = typeof body.text === "string" ? body.text.replace(/[#*_`>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS) : "";
    if (!text) return Response.json({ error: "Nothing to read." }, { status: 400 });
    const voiceName = resolveSpeechVoice(body.voice) ?? (body.voice === 'male' ? VOICES.male : body.voice === 'female' || body.voice === undefined ? VOICES.female : undefined);
    if (!voiceName) return Response.json({ error: 'Unsupported voice.' }, { status: 400 });
    const paused = await getCurrentAiPause(MODEL);
    if (paused) return Response.json({ error: paused.message }, { status: paused.kind === 'credits' ? 402 : 403 });
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: request.signal,
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: indianTeacherPrompt(text) }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
        stream_format: "sse",
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`Speech failed [${upstream.status}]: ${detail}`);
      let details: unknown = detail;
      try { details = JSON.parse(detail); } catch { /* Preserve provider text. */ }
      const failure = classifyAiFailure(upstream.status, details);
      if (failure.kind === 'credits') await setAiPause(failure);
      if (failure.kind === 'denied' && !/provider_not_available_in_region|model_requires_retention_consent|model_vendor_not_enabled/.test(detail)) await setAiPause(failure, MODEL);
      return Response.json({ error: encodeAiFailure(failure) }, { status: upstream.status });
    }
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
    } catch (error) {
      if (request.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return new Response(null, { status: 499 });
      return Response.json({ error: 'Speech could not finish.' }, { status: 503 });
    }
  } } },
});

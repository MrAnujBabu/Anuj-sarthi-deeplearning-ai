import { createFileRoute } from "@tanstack/react-router";
import { INDIAN_DUBBING_DELIVERY, INDIAN_BRIGHT_DELIVERY } from '@/lib/voice-style';
import { youtubeDeliveryPrompt, youtubeVoiceProfile } from '@/lib/youtube-voice-profile';
import { isAiCancellation } from '@/lib/ai/cancellation';

const MODEL = "google/gemini-2.5-pro-tts";
const MAX_CHARS = 1500;
const VOICES: Record<string, string> = { female: "Kore", male: "Charon" };
/** Extra Gemini voices the YouTube page may request so each Sarvam voice keeps its own backup. */
const BACKUP_VOICE_NAMES = new Set(["Kore", "Charon", "Fenrir", "Puck", "Orus", "Iapetus", "Aoede", "Leda", "Sulafat"]);

/** Steering text keeps the Indian-teacher accent; Gemini TTS reads it from the input, not a system prompt. */
export function indianTeacherPrompt(text: string, dubbing = false, bright = false) {
  if (bright) return `${INDIAN_BRIGHT_DELIVERY} Speak as a friendly North Indian NEET teacher with even loudness and smooth Hindi-English transitions. Read only the supplied text without adding or translating words or reading these instructions aloud:\n${text}`;
  if (dubbing) return `${INDIAN_DUBBING_DELIVERY} Speak as a friendly North Indian NEET teacher at a comfortable pace with even loudness, complete word endings and clear scientific terms. No forced fillers, fake laughter or breath effects. Read only the supplied text without adding or translating words or reading these instructions aloud:\n${text}`;
  return `Speak like a real, warm North Indian NEET teacher talking one-on-one with a student: natural Indian English accent, Hindi words pronounced the desi way, clear diction, relaxed conversational Hinglish rhythm with natural pauses — not a news reader, not an American accent. Keep the same warm, understated voice throughout. Polish lightly: short pauses between ideas, smooth Hindi-English transitions, complete word endings and clear scientific terms. Keep a comfortable conversational pace and even loudness; no exaggerated emotion, forced fillers, fake laughter or breath effects. Read only the supplied text, without adding or translating words or reading these instructions aloud:\n${text}`;
}

export const Route = createFileRoute("/api/speech")({
  server: { handlers: { POST: async ({ request }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return Response.json({ error: "Voice is not configured." }, { status: 503 });
    let body: { text?: unknown; voice?: unknown; style?: unknown; youtubePersona?: unknown; voiceName?: unknown } | null;
    try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
    if (!body || typeof body !== "object") return Response.json({ error: "Bad request." }, { status: 400 });
    const text = typeof body.text === "string" ? body.text.replace(/[#*_`>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS) : "";
    if (!text) return Response.json({ error: "Nothing to read." }, { status: 400 });
    const dubbing = body.style === 'indian-dubbing' && body.voice === 'male';
    const bright = body.style === 'indian-bright' && body.voice === 'female';
    const requested = (body as { voiceName?: unknown }).voiceName;
    const profile = youtubeVoiceProfile(body.youtubePersona);
    const voiceName = profile?.voiceName ?? (typeof requested === "string" && BACKUP_VOICE_NAMES.has(requested) ? requested : VOICES[body.voice === "male" ? "male" : "female"]);
    try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      signal: request.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: youtubeDeliveryPrompt(text, body.youtubePersona) ?? indianTeacherPrompt(text, dubbing, bright) }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
        stream_format: "sse",
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`Speech failed [${upstream.status}]: ${detail}`);
      return Response.json({ error: upstream.status === 402 ? "AI credits khatam ho gaye." : "Awaaz abhi nahi ban paayi." }, { status: upstream.status });
    }
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream", "Cache-Control": "no-cache" } });
    } catch (error) {
      if (request.signal.aborted || isAiCancellation(error)) return new Response(null, { status: 499 });
      throw error;
    }
  } } },
});

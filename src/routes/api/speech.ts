import { createFileRoute } from "@tanstack/react-router";

const MODEL = "google/gemini-2.5-pro-tts";
const MAX_CHARS = 1500;
const VOICES: Record<string, string> = { female: "Kore", male: "Charon" };

/** Steering text keeps the Indian-teacher accent; Gemini TTS reads it from the input, not a system prompt. */
export function indianTeacherPrompt(text: string) {
  return `Speak like a warm, patient Indian NEET teacher with a natural Indian English accent, clear pronunciation and Hinglish intonation. Read this aloud:\n${text}`;
}

export const Route = createFileRoute("/api/speech")({
  server: { handlers: { POST: async ({ request }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return Response.json({ error: "Voice is not configured." }, { status: 503 });
    let body: { text?: unknown; voice?: unknown };
    try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
    const text = typeof body.text === "string" ? body.text.replace(/[#*_`>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS) : "";
    if (!text) return Response.json({ error: "Nothing to read." }, { status: 400 });
    const voiceName = VOICES[body.voice === "male" ? "male" : "female"];
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      return Response.json({ error: upstream.status === 402 ? "AI credits khatam ho gaye." : "Awaaz abhi nahi ban paayi." }, { status: upstream.status });
    }
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream", "Cache-Control": "no-cache" } });
  } } },
});

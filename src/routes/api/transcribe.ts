import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 20 * 1024 * 1024; // ~10 min of 16 kHz mono WAV
const MODEL = "openai/gpt-transcribe";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "Voice typing is not configured." }, 500);
        let file: File;
        try {
          const form = await request.formData();
          const f = form.get("file");
          if (!(f instanceof File)) return json({ error: "No audio received." }, 400);
          file = f;
        } catch {
          return json({ error: "Bad upload." }, 400);
        }
        if (!file.size || file.size > MAX_BYTES) return json({ error: "Recording too long — keep it under 10 minutes." }, 413);
        if (!file.type.startsWith("audio/")) return json({ error: "Only audio is accepted." }, 415);

        const body = new FormData();
        body.append("model", MODEL);
        body.append("file", file, file.name || "dictation.wav");
        body.append("response_format", "json");
        body.append("stream", "true");
        body.append("languages", "hi");
        body.append("languages", "en");
        body.append("prompt", "NEET student dictating a Physics, Chemistry or Biology doubt in Hindi, English or Hinglish.");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body,
          signal: request.signal,
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          console.error(`Transcription failed [${res.status}]: ${text}`);
          let message = "Voice typing failed. Try again or type your question.";
          try { message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.message ?? message; } catch { /* keep default */ }
          if (res.status === 402) message = "AI credits khatam — voice typing abhi band hai. Saved practice chalti rahegi.";
          return json({ error: message }, res.status);
        }

        // Collect the streamed SSE transcript into final text.
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "", deltas = "", done = "";
        for (;;) {
          const { value, done: end } = await reader.read();
          if (end) break;
          buf += value;
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === "transcript.text.delta") deltas += ev.delta ?? "";
              else if (ev.type === "transcript.text.done") done = ev.text ?? "";
              else if (ev.type === "error" || ev.error) return json({ error: ev.error?.message ?? "Transcription error." }, 502);
            } catch { /* ignore partial */ }
          }
        }
        return json({ text: (done || deltas).trim() });
      },
    },
  },
});

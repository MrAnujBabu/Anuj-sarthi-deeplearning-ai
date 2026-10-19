import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ArrowLeft, Mic, MicOff, PhoneOff, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice mode — SnapSolve" },
      { name: "description", content: "Talk to your NEET tutor hands-free: speak your doubt and hear the answer." },
      { property: "og:title", content: "Voice mode — SnapSolve" },
      { property: "og:description", content: "Voice-to-voice NEET doubt solving, no typing needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoicePage,
});

type Row = { id: string; role: "user" | "assistant"; text: string };

function VoicePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thinking, setThinking] = useState(false);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
      const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
      const delta = typeof event["delta"] === "string" ? event["delta"] : "";
      if (!delta) return;
      if (role === "assistant") setThinking(false);
      setRows((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role) return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
        return [...prev, { id: crypto.randomUUID(), role, text: delta }];
      });
    } else if (event.type === "app.delegation.pending") {
      setThinking(true);
    } else if (event.type === "app.delegation.error" || event.type === "app.closed") {
      setThinking(false);
    }
  }, []);

  const voice = useLiveVoice({ onEvent });
  const canStart = voice.status === "idle" || voice.status === "closed";
  const live = voice.status === "connected";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-4">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label="Back" className="grid size-9 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Voice mode</h1>
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {voice.status === "connecting" ? "Connecting…" : live ? (thinking ? "Soch raha hai…" : "Live · bolo") : voice.status === "stopping" ? "Ending…" : "Ready"}
        </span>
      </header>

      <section className="flex-1 space-y-3 overflow-y-auto py-6" aria-live="polite">
        {rows.length === 0 && (
          <p className="pt-16 text-center text-sm text-muted-foreground">
            Start dabao aur apna doubt bolo. Tutor bolkar jawab dega — type karne ki zarurat nahi.
          </p>
        )}
        {rows.map((r) => (
          <p
            key={r.id}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
              r.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {r.text}
          </p>
        ))}
      </section>

      {voice.error && (
        <p role="alert" className="mb-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          {voice.error}
        </p>
      )}
      <audio ref={voice.audioRef} className="sr-only" />
      <footer className="flex items-center justify-center gap-3 pb-2">
        {voice.playbackBlocked && (
          <Button variant="outline" onClick={voice.resumePlayback}>
            <Volume2 className="size-4" /> Play voice
          </Button>
        )}
        {canStart ? (
          <Button size="lg" className="rounded-full px-8" onClick={voice.start}>
            <Phone className="size-4" /> Start
          </Button>
        ) : (
          <>
            <Button
              size="icon"
              variant="outline"
              className="size-12 rounded-full"
              disabled={!live}
              onClick={() => voice.setMuted(!voice.muted)}
              aria-label={voice.muted ? "Unmute" : "Mute"}
            >
              {voice.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full px-8"
              disabled={voice.status === "stopping"}
              onClick={voice.stop}
            >
              <PhoneOff className="size-4" /> End
            </Button>
          </>
        )}
      </footer>
    </main>
  );
}

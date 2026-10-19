import { Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { recordWav, type Recording } from "@/lib/record-wav";

// Inserts text into the composer textarea so React state (controlled or not) picks it up.
function insertIntoTextarea(el: HTMLTextAreaElement, text: string) {
  const prev = el.value;
  const next = prev && !/\s$/.test(prev) ? `${prev} ${text}` : prev + text;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(next.length, next.length);
}

export function DictateButton({ disabled }: { disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const rec = useRef<Recording | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== "rec") return;
    const started = Date.now();
    const t = setInterval(() => {
      setSecs(Math.floor((Date.now() - started) / 1000));
      setLevel(rec.current?.level() ?? 0);
    }, 120);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => () => rec.current?.cancel(), []);
  useEffect(() => { if (state === "rec" && secs >= 600) void stop(); return undefined; }, [secs, state]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("Is browser mein mic support nahi hai."); return; }
    try {
      rec.current = await recordWav();
      setSecs(0);
      setState("rec");
    } catch (e) {
      const name = (e as DOMException).name;
      toast.error(name === "NotAllowedError" ? "Mic ki permission do (browser address bar mein mic icon)." : "Mic shuru nahi ho paya.");
    }
  };

  const cancel = () => { rec.current?.cancel(); rec.current = null; setState("idle"); };

  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setState("busy");
    try {
      const file = await r.stop();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Voice typing failed.");
      if (!data.text) throw new Error("Kuch samajh nahi aaya — dobara bolo.");
      const ta = btn.current?.closest("form")?.querySelector("textarea");
      if (ta) insertIntoTextarea(ta, data.text);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setState("idle");
    }
  };

  if (state === "rec") {
    const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    return (
      <div className="flex items-center gap-1" role="group" aria-label="Recording">
        <PromptInputButton ref={btn} onClick={cancel} variant="ghost" className="px-2" aria-label="Cancel dictation" title="Cancel">
          <X className="size-4" />
        </PromptInputButton>
        <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground" aria-live="polite">
          <span className="size-2 rounded-full bg-destructive transition-transform" style={{ transform: `scale(${1 + Math.min(level * 12, 1.2)})` }} />
          {mm}
        </span>
        <PromptInputButton onClick={stop} variant="secondary" className="gap-1.5 px-2" aria-label="Stop and insert text" title="Done — insert text">
          <Square className="size-3.5 fill-current" />
          <span>Done</span>
        </PromptInputButton>
      </div>
    );
  }
  return (
    <PromptInputButton ref={btn} onClick={start} variant="ghost" className="px-2" disabled={disabled || state === "busy"}
      aria-label={state === "busy" ? "Transcribing" : "Dictate (voice typing)"} title="Bol kar likho">
      {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
    </PromptInputButton>
  );
}

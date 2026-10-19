import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, SkipForward, Square, Timer } from "lucide-react";
import { getQuizTimer } from "@/lib/memory.functions";
import { MessageResponse } from "@/components/ai-elements/message";
import { normalizeMath } from "@/lib/math-format";

/** Compact checkbox-card answer list for the open quiz question, with optional auto-skip timer. */
export function QuizActions({ options, labels = {}, onSend, questionKey, selectedAnswer, disabled = false }: { options: string[]; labels?: Record<string, string>; onSend: (text: string) => void; questionKey?: string; selectedAnswer?: string | undefined; disabled?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [limit, setLimit] = useState(0);
  const [left, setLeft] = useState(0);
  const answered = useRef(false);

  useEffect(() => { getQuizTimer().then((r) => setLimit(r.seconds)).catch(() => setLimit(0)); }, []);
  useEffect(() => { answered.current = false; setPicked(null); setLeft(limit); }, [limit, questionKey]);
  useEffect(() => {
    if (disabled || !limit || picked || answered.current || options.length === 0) return;
    if (left <= 0) { answered.current = true; onSend("skip"); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, limit, picked, options.length, disabled]);

  const choose = (o: string) => { if (disabled || answered.current) return; answered.current = true; setPicked(o); onSend(o); };
  const command = (text: string) => { if (disabled || answered.current) return; answered.current = true; onSend(text); };

  return (
    <div className="space-y-2 border-t border-border pt-3" role="group" aria-label="Quiz answer">
      {options.length > 0 && (
        <div className={`grid gap-2 ${Object.keys(labels).length ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {options.map((o) => {
            const active = (selectedAnswer ?? picked) === o;
            return (
              <Button
                key={o}
                type="button"
                variant="outline"
                role="checkbox"
                aria-label={`Answer ${o}${labels[o] ? `: ${labels[o]}` : ""}`}
                aria-checked={active}
                aria-disabled={disabled || !!picked}
                onClick={() => choose(o)}
                className={`h-auto min-h-10 w-full min-w-0 items-start justify-start whitespace-normal text-left select-none gap-2.5 rounded-lg border px-3 py-2 text-sm leading-snug transition-colors ${
                  active
                    ? "border-primary/60 bg-primary/10 text-primary hover:bg-primary/10 ring-1 ring-primary/15"
                    : picked
                      ? "border-border bg-card text-muted-foreground"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <input type="checkbox" className="pointer-events-none mt-0.5 size-4 shrink-0 accent-primary" checked={active} tabIndex={-1} readOnly aria-hidden="true" />
                <span className="w-6 shrink-0 font-semibold">{labels[o] ? `(${o})` : o}</span>
                {labels[o] && <span className="assistant-answer min-w-0 flex-1 break-words font-normal [overflow-wrap:anywhere] [&_p]:m-0 [&_p]:leading-snug"><MessageResponse>{normalizeMath(labels[o])}</MessageResponse></span>}
              </Button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {limit > 0 && options.length > 0 && !picked && (
          <span className={`mr-2 inline-flex items-center gap-1 text-xs tabular-nums ${left <= 5 ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite"><Timer className="size-3.5" /> {left}s</span>
        )}
        <Button disabled={disabled} size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-primary" onClick={() => command("hint")}><Lightbulb className="size-3.5" />Hint</Button>
        <Button disabled={disabled} size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => command("skip")}><SkipForward className="size-3.5" />Skip</Button>
        <Button disabled={disabled} size="sm" variant="ghost" className="ml-auto h-8 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => command("stop quiz")}><Square className="size-3" />Stop quiz</Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getQuizTimer } from "@/lib/memory.functions";

/** Checkbox-style answer list for the open quiz question, with optional auto-skip timer. */
export function QuizActions({ options, onSend, questionKey }: { options: string[]; onSend: (text: string) => void; questionKey?: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [limit, setLimit] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => { getQuizTimer().then((r) => setLimit(r.seconds)).catch(() => setLimit(0)); }, []);
  useEffect(() => { setPicked(null); setLeft(limit); }, [limit, questionKey]);
  useEffect(() => {
    if (!limit || picked || options.length === 0) return;
    if (left <= 0) { onSend("skip"); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, limit, picked, options.length]);

  const choose = (o: string) => { if (picked) return; setPicked(o); onSend(o); };

  return (
    <div className="space-y-3" role="group" aria-label="Quiz answer">
      {options.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 hover:bg-accent">
              <input type="checkbox" className="size-4 accent-primary" checked={picked === o} disabled={!!picked} onChange={() => choose(o)} aria-label={`Answer ${o}`} />
              <span className="font-semibold">Option {o}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {limit > 0 && options.length > 0 && !picked && (
          <span className={`text-sm tabular-nums ${left <= 5 ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">⏱ {left}s</span>
        )}
        <Button size="sm" variant="outline" onClick={() => onSend("hint")}>Hint</Button>
        <Button size="sm" variant="outline" onClick={() => onSend("skip")}>Skip</Button>
        <Button size="sm" variant="ghost" onClick={() => onSend("stop quiz")}>Stop quiz</Button>
      </div>
    </div>
  );
}

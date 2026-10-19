import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, SkipForward, Square, Timer } from "lucide-react";
import { useQuizTimerPreference } from '@/lib/quiz-timer-preference';
import { MessageResponse } from "@/components/ai-elements/message";
import { normalizeMath } from "@/lib/math-format";
import { Switch } from "@/components/ui/switch";
import { useNumericAnswerLabels, useQuizKeyboardShortcuts } from '@/lib/quiz-label-preference';
import { quizAnswerForKey } from '@/lib/quiz-shortcuts';

/** Compact checkbox-card answer list for the open quiz question, with optional auto-skip timer. */
export function QuizActions({ options, labels = {}, onSend, questionKey, selectedAnswer, disabled = false, chatHidden = false, onChatHidden, answersOnly = false }: { options: string[]; labels?: Record<string, string>; onSend: (text: string) => void; questionKey?: string; selectedAnswer?: string | undefined; disabled?: boolean; chatHidden?: boolean; onChatHidden?: (hidden: boolean) => void; answersOnly?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [numericLabels] = useNumericAnswerLabels();
  const [keyboardEnabled] = useQuizKeyboardShortcuts();
  const { seconds: limit } = useQuizTimerPreference();
  const [left, setLeft] = useState(0);
  const answered = useRef(false);

  useEffect(() => { answered.current = false; setPicked(null); setLeft(limit); }, [questionKey]);
  useEffect(() => { setLeft(limit); }, [limit]);
  useEffect(() => {
    if (answersOnly || disabled || !limit || picked || answered.current || options.length === 0) return;
    const t = setTimeout(() => {
      if (left <= 1) { answered.current = true; setLeft(0); onSend('skip'); }
      else setLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [left, limit, picked, options.length, disabled, answersOnly]);

  const choose = (o: string) => { if (disabled || answered.current) return; answered.current = true; setPicked(o); onSend(o); };
  const command = (text: string) => { if (disabled || answered.current) return; answered.current = true; onSend(text); };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!keyboardEnabled || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.isComposing || disabled || answered.current) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]')) return;
      const answer = quizAnswerForKey(event);
      if (!answer || !options.includes(answer)) return;
      event.preventDefault(); choose(answer);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [options, disabled, questionKey, onSend, keyboardEnabled]);

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
                aria-keyshortcuts={String(['A','B','C','D'].indexOf(o) + 1)}
                title={`Answer ${o} · ${['A','B','C','D'].indexOf(o) + 1}`}
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
                <span className="w-6 shrink-0 font-semibold text-muted-foreground">{numericLabels ? ['A', 'B', 'C', 'D'].indexOf(o) + 1 : labels[o] ? `(${o})` : o}</span>
                {labels[o] && <span className="assistant-answer min-w-0 flex-1 break-words text-[1.05em] font-normal text-foreground [overflow-wrap:anywhere] [&_p]:m-0 [&_p]:leading-relaxed"><MessageResponse>{normalizeMath(labels[o])}</MessageResponse></span>}
              </Button>
            );
          })}
        </div>
      )}
      {!answersOnly && <div className="flex flex-wrap items-center gap-1">
        {limit > 0 && options.length > 0 && !picked && (
          <span className={`mr-2 inline-flex items-center gap-1 text-xs tabular-nums ${left <= 5 ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite"><Timer className="size-3.5" /> {left}s</span>
        )}
        <Button disabled={disabled} size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-primary" onClick={() => command("hint")}><Lightbulb className="size-3.5" />Hint</Button>
        <Button disabled={disabled} size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => command("skip")}><SkipForward className="size-3.5" />Skip</Button>
        {onChatHidden && <label className="inline-flex min-h-8 items-center gap-2 px-2 text-xs text-muted-foreground"><Switch checked={chatHidden} onCheckedChange={onChatHidden} aria-label="Hide Chat Widget" /><span>Hide Chat Widget</span></label>}
        <Button disabled={disabled} size="sm" variant="ghost" className="ml-auto h-8 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => command("stop quiz")}><Square className="size-3" />Stop quiz</Button>
      </div>}
    </div>
  );
}

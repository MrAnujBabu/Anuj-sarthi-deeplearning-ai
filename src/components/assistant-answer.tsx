import { ChevronRight } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { DiagramCard } from "@/components/diagram-card";
import { isRenderableSvg, splitDiagrams } from "@/lib/diagrams";
import { normalizeMath } from "@/lib/math-format";
import { stripCards } from "@/lib/srs";
import { splitToggles } from "@/lib/toggles";

/**
 * Renders one assistant answer: the written steps plus any diagram Claude drew
 * for it, in the order they arrived.
 */
/** Put MCQ options written on one line onto separate lines. */
export function splitOptions(text: string) {
  return text
    .split("\n")
    .map((l) => (/\(A\)/.test(l) && /\(B\)/.test(l) ? l.replace(/\s+(?=\([B-D]\)\s)/g, "  \n") : l))
    .join("\n");
}

export function AssistantAnswer({
  text,
  isAnimating,
  compact = false,
  boldQuestion = false,
}: {
  text: string;
  isAnimating: boolean;
  compact?: boolean;
  boldQuestion?: boolean;
}) {
  const segments = splitDiagrams(splitOptions(stripCards(text)));

  return (
    <div className={`assistant-answer flex w-full flex-col ${compact ? "gap-2" : "gap-3"} ${boldQuestion ? 'study-question-bold' : ''}`}>
      {segments.map((s, i) => {
        if (s.kind === "diagram" && !(s.complete && !isRenderableSvg(s.svg))) {
          return <DiagramCard key={i} svg={s.svg} complete={s.complete} />;
        }
        const md = s.kind === "text" ? s.text : "```svg\n" + s.svg + "\n```";
        // Toggles render as real <details>: the body is re-rendered as markdown
        // so headings, lists, tables and callouts stay formatted inside the fold.
        return splitToggles(md).map((t, j) =>
          t.kind === "toggle" ? (
            <details key={`${i}-${j}`} className="group rounded-lg border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                <span className="min-w-0 break-words">{t.summary}</span>
              </summary>
              <div className="border-t px-3 py-2">
                <MessageResponse isAnimating={isAnimating}>{normalizeMath(t.body)}</MessageResponse>
              </div>
            </details>
          ) : (
            <MessageResponse key={`${i}-${j}`} isAnimating={isAnimating}>
              {normalizeMath(t.text)}
            </MessageResponse>
          ),
        );
      })}
    </div>
  );
}

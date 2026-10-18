import { MessageResponse } from "@/components/ai-elements/message";
import { DiagramCard } from "@/components/diagram-card";
import { isRenderableSvg, splitDiagrams } from "@/lib/diagrams";
import { normalizeMath } from "@/lib/math-format";
import { stripCards } from "@/lib/srs";

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
}: {
  text: string;
  isAnimating: boolean;
}) {
  const segments = splitDiagrams(splitOptions(stripCards(text)));

  return (
    <div className="assistant-answer flex w-full flex-col gap-3">
      {segments.map((s, i) =>
        s.kind === "text" || (s.complete && !isRenderableSvg(s.svg)) ? (
          <MessageResponse key={i} isAnimating={isAnimating}>
            {s.kind === "text" ? normalizeMath(s.text) : "```svg\n" + s.svg + "\n```"}
          </MessageResponse>
        ) : (
          <DiagramCard key={i} svg={s.svg} complete={s.complete} />
        ),
      )}
    </div>
  );
}

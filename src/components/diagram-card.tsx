import { Download, PencilLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SVG_SANITIZE_CONFIG } from "@/lib/diagrams";
import { cn } from "@/lib/utils";

/**
 * Shows a diagram Claude drew for this doubt. The drawing arrives as SVG text,
 * so it is cleaned (scripts, remote links, embedded frames removed) before it
 * is put on the page, and only ever after the browser has loaded.
 */
export function DiagramCard({
  svg,
  complete,
  className,
}: {
  svg: string;
  complete: boolean;
  className?: string;
}) {
  const [clean, setClean] = useState<string | null>(null);

  useEffect(() => {
    if (!complete) return;
    let alive = true;
    import("dompurify")
      .then(({ default: DOMPurify }) => {
        if (!alive) return;
        setClean(DOMPurify.sanitize(svg, SVG_SANITIZE_CONFIG));
      })
      .catch(() => setClean(null));
    return () => {
      alive = false;
    };
  }, [svg, complete]);

  if (!complete || !clean) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-6 text-sm text-muted-foreground",
          className,
        )}
      >
        <PencilLine className="size-4 shrink-0" />
        <Shimmer>Drawing the diagram…</Shimmer>
      </div>
    );
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([clean], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "snapsolve-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <figure className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div
        className="flex justify-center bg-card px-3 py-4 [&_svg]:h-auto [&_svg]:max-h-[60vh] [&_svg]:w-full [&_svg]:max-w-[420px]"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      <figcaption className="flex items-center justify-between gap-2 border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>Diagram — drawn for this doubt</span>
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10"
        >
          <Download className="size-3.5" />
          Save
        </button>
      </figcaption>
    </figure>
  );
}

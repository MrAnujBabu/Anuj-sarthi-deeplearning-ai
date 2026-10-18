/**
 * Claude draws diagrams inline as a fenced ```svg block inside its answer.
 * This splits an answer into readable text segments and drawable segments so
 * the UI can render real pictures instead of showing the student raw markup.
 */

export type DiagramSegment =
  | { kind: "text"; text: string }
  | { kind: "diagram"; svg: string; complete: boolean };

const FENCE = /```[ \t]*(svg|diagram)[ \t]*\r?\n/gi;

export function splitDiagrams(text: string): DiagramSegment[] {
  const out: DiagramSegment[] = [];
  const fence = new RegExp(FENCE.source, FENCE.flags);
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(text))) {
    const before = text.slice(cursor, m.index);
    if (before.trim()) out.push({ kind: "text", text: before });

    const bodyStart = m.index + m[0].length;
    const close = text.indexOf("```", bodyStart);
    if (close === -1) {
      // Still streaming: the drawing has not finished arriving.
      out.push({ kind: "diagram", svg: text.slice(bodyStart), complete: false });
      return out;
    }

    out.push({ kind: "diagram", svg: text.slice(bodyStart, close), complete: true });
    cursor = close + 3;
    fence.lastIndex = cursor;
  }

  const rest = text.slice(cursor);
  if (rest.trim()) out.push({ kind: "text", text: rest });
  return out;
}

/** Only render something as a picture if it really is an <svg> element. */
export function isRenderableSvg(svg: string): boolean {
  const t = svg.trim();
  return /<svg[\s>]/i.test(t) && !/<(script|foreignObject|iframe)\b/i.test(t);
}

/**
 * What a drawing is allowed to contain before it reaches the page.
 * Only drawing tags and their geometry/label attributes survive; scripts,
 * embedded styles, frames and any reference to another site are dropped.
 */
export const SVG_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "svg", "g", "defs", "marker", "path", "line", "polyline", "polygon",
    "rect", "circle", "ellipse", "text", "tspan", "title", "desc", "use",
    "clipPath", "mask", "linearGradient", "radialGradient", "stop", "textPath",
  ],
  ALLOWED_ATTR: [
    "viewBox", "width", "height", "preserveAspectRatio", "xmlns",
    "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy",
    "d", "points", "transform",
    "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width",
    "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-opacity",
    "marker-start", "marker-mid", "marker-end", "markerWidth", "markerHeight",
    "refX", "refY", "orient",
    "font-size", "font-family", "font-weight", "font-style", "text-anchor",
    "dominant-baseline", "letter-spacing", "opacity", "id", "class",
    "stop-color", "stop-opacity", "offset", "gradientUnits", "gradientTransform",
    "spreadMethod", "clip-path", "mask",
  ],
};


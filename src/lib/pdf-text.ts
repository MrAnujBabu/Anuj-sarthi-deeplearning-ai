import type { FileUIPart } from "ai";
import { extractLocally } from './file-extract';

export const DOC_RE = /<doc name="([^"]*)">[\s\S]*?<\/doc>\n*/g;

/** Turn text-based PDFs into compact text once in the browser; scanned PDFs stay as files for the AI reader. */
export async function pdfsToText(files: FileUIPart[]): Promise<{ files: FileUIPart[]; text: string }> {
  const keep: FileUIPart[] = [];
  let text = "";
  for (const f of files) {
    if (/\.ppt$/i.test(f.filename ?? '')) throw new Error('Legacy .ppt is not supported. Export it as PDF or save as .pptx, then upload.');
    if (/\.pptx$/i.test(f.filename ?? '') || f.mediaType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      const response = await fetch(f.url);
      if (!response.ok) throw new Error('Could not open PowerPoint attachment.');
      const file = new File([await response.arrayBuffer()], f.filename ?? 'slides.pptx', { type: f.mediaType });
      const content = await extractLocally(file);
      if (!content?.trim()) throw new Error('PowerPoint has no readable text. Export it as PDF to include images and diagrams.');
      const name = file.name.replace(/"/g, "'");
      text += `<doc name="${name}">\n[PowerPoint text only; slide images and diagrams were not read.]\n${content.slice(0, 300000)}\n</doc>\n\n`;
      continue;
    }
    if (f.mediaType !== "application/pdf") { keep.push(f); continue; }
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const bytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
      const pdf = await getDocumentProxy(bytes);
      const { text: pages } = await extractText(pdf, { mergePages: false });
      const body = (pages as string[]).map((t, i) => `[Page ${i + 1}]\n${t.replace(/[ \t]+/g, " ").trim()}`).join("\n\n");
      if (body.replace(/\[Page \d+\]/g, "").trim().length < 200 * Math.max(1, pages.length / 4)) { keep.push(f); continue; }
      const name = (f.filename ?? "document.pdf").replace(/"/g, "'");
      text += `<doc name="${name}">\n${body.slice(0, 300000)}\n</doc>\n\n`;
    } catch {
      keep.push(f);
    }
  }
  return { files: keep, text };
}

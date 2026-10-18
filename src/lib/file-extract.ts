import { unzipSync, strFromU8 } from "fflate";

const TEXT_EXT = /\.(md|markdown|txt|csv|tsv|json|html?|xml|tex|rtf|log|ya?ml)$/i;

function xmlText(xml: string) {
  return xml
    .replace(/<\/(w:p|a:p|row)>/g, "\n")
    .replace(/<(w:tab|c)[^>]*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract text in the browser when possible; returns null when the AI reader is needed (PDF, images). */
export async function extractLocally(file: File): Promise<string | null> {
  if (TEXT_EXT.test(file.name) || file.type.startsWith("text/")) return (await file.text()).slice(0, 400000);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "docx" || ext === "pptx" || ext === "xlsx") {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const pick = Object.keys(files)
      .filter((n) => (ext === "docx" ? n === "word/document.xml" : ext === "pptx" ? /^ppt\/slides\/slide\d+\.xml$/.test(n) : n === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return pick.map((n) => xmlText(strFromU8(files[n]!))).join("\n\n---\n\n").slice(0, 400000);
  }
  return null;
}

export const needsAi = (file: File) => file.type === "application/pdf" || file.type.startsWith("image/");

/** Originals are optional; successfully extracted memory remains usable without them. */
export function cleanMemoryText(text: string): string {
  // PostgreSQL text cannot contain NUL; malformed PDF glyphs can also contain lone surrogates.
  return text.replace(/\u0000/g, '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}

export function retainedFilePath(path: string, keepOriginal: boolean): string | null {
  return keepOriginal ? path : null;
}

export function readableMemoryText(text: string | null): string {
  if (!text?.trim()) throw new Error('Document read nahi hua — memory save nahi ki. Readable PDF, text ya public link dein.');
  return text.trim();
}
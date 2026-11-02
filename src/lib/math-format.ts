/** Keep prose equations inline while preserving display equations and code. */
export function normalizeMath(text: string): string {
  // Code fences (including unfinished streamed fences) and inline code are opaque.
  return text.split(/(`{3,}[^\n]*\n[\s\S]*?(?:\n`{3,}[^\n]*(?=\n|$)|$)|~{3,}[^\n]*\n[\s\S]*?(?:\n~{3,}[^\n]*(?=\n|$)|$)|`+[^`\n]*`+)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part
        .replace(/\\\(([^\n]*?)\\\)/g, (_, math: string) => `$${math}$`)
        .replace(/\$\$([^\n]*?)\$\$/g, (match, math: string, offset: number, source: string) => {
          const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
          const nextNewline = source.indexOf("\n", offset + match.length);
          const before = source.slice(lineStart, offset);
          const after = source.slice(offset + match.length, nextNewline === -1 ? source.length : nextNewline);
          return !before.trim() && !after.trim() ? match : `$${math}$`;
        });
    }).join("");
}
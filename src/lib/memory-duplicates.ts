type ComparableMemory = { title: string; content: string; source_url?: string | null };
export function canonicalMemoryUrl(value: string): string {
  const url = new URL(value.trim());
  url.hash = '';
  return url.toString();
}
export function isDuplicateMemory(a: ComparableMemory, b: ComparableMemory): boolean {
  if (a.source_url && b.source_url && canonicalMemoryUrl(a.source_url) === canonicalMemoryUrl(b.source_url)) return true;
  const content = a.content.trim();
  return content ? content === b.content.trim() : !b.content.trim() && a.title.trim() === b.title.trim();
}
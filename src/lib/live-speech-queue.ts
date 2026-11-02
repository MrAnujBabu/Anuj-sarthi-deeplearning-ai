/** Queued thoughts are merged into one look-ahead request up to this many characters. */
export const SPEECH_MERGE_CHARS = 320;

/** One active sentence and one look-ahead request, scoped to a single reply. */
export class LiveSpeechQueue {
  private controller = new AbortController();
  private items: Array<{ text: string; ready?: Promise<Response> }> = [];
  private running = false;
  constructor(private options: {
    request: (text: string, signal: AbortSignal) => Promise<Response>;
    play: (text: string, signal: AbortSignal, ready: Promise<Response>) => Promise<void>;
    busy: (on: boolean) => void;
    error: (error: unknown) => void;
  }) {}
  enqueue(text: string) {
    if (this.controller.signal.aborted || !text.trim()) return;
    this.items.push({ text: text.trim() });
    this.prefetch();
    if (!this.running) void this.drain();
  }
  private prefetch() {
    for (let i = 0; i < Math.min(2, this.items.length); i++) {
      const item = this.items[i];
      if (!item || item.ready) continue;
      // Thoughts that piled up while speaking go out as one request: fewer calls,
      // so the shared speech service is far less likely to refuse mid-answer.
      for (let next = this.items[i + 1]; next && !next.ready && item.text.length + next.text.length < SPEECH_MERGE_CHARS; next = this.items[i + 1]) {
        item.text = `${item.text} ${next.text}`;
        this.items.splice(i + 1, 1);
      }
      item.ready = this.options.request(item.text, this.controller.signal);
      // Observe failures immediately; drain still receives and surfaces the same error.
      void item.ready.catch(() => {});
    }
  }
  private async drain() {
    this.running = true;
    this.options.busy(true);
    try {
      while (this.items.length && !this.controller.signal.aborted) {
        const item = this.items[0];
        if (!item?.ready) break;
        await this.options.play(item.text, this.controller.signal, item.ready);
        this.items.shift();
        this.prefetch();
      }
    } catch (error) {
      if (!this.controller.signal.aborted) {
        this.cancel();
        this.options.error(error);
      }
    } finally {
      this.running = false;
      if (!this.controller.signal.aborted) this.options.busy(false);
    }
  }
  cancel() {
    this.controller.abort();
    this.items = [];
    this.options.busy(false);
  }
}

/** Flush complete thoughts as soon as punctuation arrives, even within a caption delta. */
export function takeSpeechThoughts(buffer: string, options: { clauses?: boolean } = {}) {
  const clauses = options.clauses ?? true;
  const thoughts: string[] = [];
  let end = 0;
  const boundaries = /[.!?।]["')\]]?(?=\s|$)|[,;:](?=\s|$)/g;
  for (const match of buffer.matchAll(boundaries)) {
    const next = (match.index ?? 0) + match[0].length;
    const text = buffer.slice(end, next).trim();
    // Commas split clauses early so the first audio starts within a breath of the
    // caption; tiny fragments (lists, numeric notation) still stay together.
    // Sarvam reads each request with its own intonation, so clause pieces sound
    // broken there; it waits for whole sentences instead.
    if (/[,;:]$/.test(text) && (!clauses || text.length < 12)) continue;
    if (/\d\.$/.test(text)) continue;
    if (text) thoughts.push(text);
    end = next;
  }
  return { thoughts, remainder: buffer.slice(end) };
}
/** Local observation, not an authoritative provider playback-done signal. */
export class VoiceQuizPlayback {
  private id = '';
  private lastOption = '';
  private captions = '';
  private heard = false;
  private quiet: number | null = null;
  private ready = false;
  private normalize(text: string) { return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
  begin(id: string, option: string) {
    this.id = id; this.lastOption = this.normalize(option); this.captions = '';
    this.heard = false; this.quiet = null; this.ready = false;
  }
  transcript(delta: string) { this.captions = (this.captions + this.normalize(delta)).slice(-16000); }
  sample(level: number, now: number, playing: boolean): string | null {
    if (!this.id || this.ready || !playing) { this.quiet = null; return null; }
    if (level > 0.012) { this.heard = true; this.quiet = null; return null; }
    if (!this.heard || !this.lastOption || !this.captions.includes(this.lastOption)) return null;
    this.quiet ??= now;
    if (now - this.quiet < 1500) return null;
    this.ready = true; return this.id;
  }
}
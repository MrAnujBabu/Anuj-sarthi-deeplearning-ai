import { describe, expect, it } from 'vitest';
import { usesTalkTurns, speakableText } from './talk-turn';

describe('talk-and-listen voice', () => {
  it('uses the live call on the Vercel site', () => {
    expect(usesTalkTurns('https://snapsolveanuj.vercel.app')).toBe(false);
  });
  it('keeps the live call on other hosts', () => {
    expect(usesTalkTurns('https://project--069fc516-1b8b-4ac5-b64e-37250cf7e8bb.lovable.app')).toBe(false);
  });
  it('never reads hidden tags aloud', () => {
    expect(speakableText('Sahi! <!--card {"q":"x"}--> **Score: 1/1**')).toBe('Sahi! Score: 1/1');
  });
  it('never reads diagram code aloud', () => {
    expect(speakableText('Mitochondria.\n```svg\n<svg></svg>\n```\nDone')).toBe('Mitochondria. Done');
  });
});

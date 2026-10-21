import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AssistantAnswer } from '@/components/assistant-answer';
import { formatVoiceReply } from '@/lib/voice-format';

afterEach(cleanup);

const summaryOf = (el: HTMLElement) => el.querySelector('summary');

describe('voice mode toggle end to end', () => {
  it('quiz feedback folds into a closed toggle, tap opens the explanation', () => {
    const spoken =
      'Shabash! Sahi jawab (B) hai — Mitochondria. Detail mein: ATP yahin banta hai aur isliye ise powerhouse kehte hain. ' +
      'Agla sawal: Ribosome kahan milte hain? (A) Nucleus (B) Cytoplasm (C) Vacuole (D) Cell wall';
    const md = formatVoiceReply(spoken, { options: false, feedbackToggle: true });
    expect(md).toContain('<details>');
    render(<AssistantAnswer text={md} isAnimating={false} compact boldQuestion />);
    const details = document.querySelector('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(summaryOf(details!)?.textContent).toContain('Shabash');
    // Explanation is inside the fold, not loose on the page.
    expect(details!.textContent).toContain('ATP');
    fireEvent.click(summaryOf(details!)!);
    expect(details!.open).toBe(true);
    // The next question renders outside the toggle.
    expect(details!.textContent).not.toContain('Ribosome kahan milte hain?');
    expect(document.body.textContent).toContain('Ribosome kahan milte hain?');
  });

  it('toggle keeps headings, lists and tables formatted inside the fold', () => {
    const md = [
      'Pehle ye line bahar hai.',
      '',
      '<details>',
      '<summary>📘 Explanation</summary>',
      '',
      '## Krebs Cycle',
      '',
      '- Pehla point',
      '- Doosra point',
      '',
      '| Step | Enzyme |',
      '| --- | --- |',
      '| One | Synthase |',
      '',
      '> **💡 Yaad rakho:** ATP banta hai',
      '',
      '</details>',
      '',
      'Baad ki line bahar hai.',
    ].join('\n');
    render(<AssistantAnswer text={md} isAnimating={false} compact />);
    const details = document.querySelector('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
    expect(summaryOf(details!)?.textContent).toContain('Explanation');
    fireEvent.click(summaryOf(details!)!);
    expect(details!.open).toBe(true);
    // Formatted structure survives inside the fold.
    expect(details!.querySelector('h2')?.textContent).toBe('Krebs Cycle');
    expect(details!.querySelectorAll('li')).toHaveLength(2);
    expect(details!.querySelector('table')).not.toBeNull();
    expect(details!.textContent).toContain('Yaad rakho');
    // Text before and after stays outside the fold.
    expect(details!.textContent).not.toContain('Pehle ye line');
    expect(details!.textContent).not.toContain('Baad ki line');
    expect(document.body.textContent).toContain('Pehle ye line');
    expect(document.body.textContent).toContain('Baad ki line');
  });

  it('multiple toggles in one reply each fold independently', () => {
    const md = [
      '<details>',
      '<summary>Pehla toggle</summary>',
      '',
      'Pehla content',
      '',
      '</details>',
      '',
      '<details>',
      '<summary>Doosra toggle</summary>',
      '',
      'Doosra content',
      '',
      '</details>',
    ].join('\n');
    render(<AssistantAnswer text={md} isAnimating={false} compact />);
    const all = document.querySelectorAll('details');
    expect(all).toHaveLength(2);
    expect(all[0]!.open).toBe(false);
    expect(all[1]!.open).toBe(false);
    fireEvent.click(summaryOf(all[0] as HTMLElement)!);
    expect(all[0]!.open).toBe(true);
    expect(all[1]!.open).toBe(false);
  });
});

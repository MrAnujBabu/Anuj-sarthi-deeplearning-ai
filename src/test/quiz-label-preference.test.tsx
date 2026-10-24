import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useBoldQuestions, useHideChatWidget, useNumericAnswerLabels, useStudyTextSize, useVoiceChoice, VOICE_CHOICES } from '@/lib/quiz-label-preference';
afterEach(() => { cleanup(); localStorage.clear(); });
it('removes American and British voice identities from selectable choices', () => {
  expect(VOICE_CHOICES.map(c => c.id)).not.toContain('us-f');
  expect(VOICE_CHOICES.map(c => c.id)).not.toContain('us-m');
  expect(VOICE_CHOICES.map(c => c.id)).not.toContain('uk-m');
});
function VoicePreference() {
  const [value] = useVoiceChoice();
  return <output aria-label="saved voice">{value}</output>;
}
it.each(['us-f', 'us-m', 'uk-m'])('replaces removed saved voice %s on reload', value => {
  localStorage.setItem('snapsolve.voice-choice', value);
  render(<VoicePreference />);
  expect(localStorage.getItem('snapsolve.voice-choice')).toBe('indian-f');
});
function Preference({ name }: { name: string }) {
  const [value, update] = useNumericAnswerLabels();
  return <input aria-label={name} type="checkbox" checked={value} onChange={e => update(e.target.checked)} />;
}
it('shares admin choice with quiz and preserves it across reload', () => {
  const view = render(<><Preference name="admin" /><Preference name="quiz" /></>);
  fireEvent.click(screen.getByLabelText('admin'));
  expect((screen.getByLabelText('quiz') as HTMLInputElement).checked).toBe(true);
  view.unmount(); render(<Preference name="reloaded quiz" />);
  expect((screen.getByLabelText('reloaded quiz') as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByLabelText('reloaded quiz'));
  expect(localStorage.getItem('snapsolve.numeric-answer-labels')).toBe('0');
});

function StudyPreference({ name }: { name: string }) {
  const [bold, setBold] = useBoldQuestions();
  const [hidden, setHidden] = useHideChatWidget();
  const [size, setSize] = useStudyTextSize();
  return <><input type="checkbox" aria-label={`${name} bold`} checked={bold} onChange={e => setBold(e.target.checked)} /><input type="checkbox" aria-label={`${name} hidden`} checked={hidden} onChange={e => setHidden(e.target.checked)} /><select aria-label={`${name} size`} value={size} onChange={() => setSize('20')}><option>16</option><option>20</option></select></>;
}
it('synchronizes bold, 20px text and hidden widget between settings and quiz after reload', () => {
  const view = render(<><StudyPreference name="settings" /><StudyPreference name="quiz" /></>);
  fireEvent.click(screen.getByLabelText('settings bold'));
  fireEvent.click(screen.getByLabelText('settings hidden'));
  fireEvent.change(screen.getByLabelText('settings size'), { target: { value: '20' } });
  expect((screen.getByLabelText('quiz bold') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('quiz hidden') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('quiz size') as HTMLSelectElement).value).toBe('20');
  view.unmount(); render(<StudyPreference name="reload" />);
  expect((screen.getByLabelText('reload bold') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('reload hidden') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('reload size') as HTMLSelectElement).value).toBe('20');
  fireEvent.click(screen.getByLabelText('reload hidden'));
  expect(localStorage.getItem('snapsolve.hide-chat-widget')).toBe('0');
});
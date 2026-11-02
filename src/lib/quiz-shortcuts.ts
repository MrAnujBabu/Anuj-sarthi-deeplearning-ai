/** Num Lock off reports navigation keys; resolve the physical keypad too. */
export function quizAnswerForKey(event: Pick<KeyboardEvent, 'key' | 'code'>): string | undefined {
  const numbers: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
  const keypad: Record<string, string> = { Numpad1: 'A', Numpad2: 'B', Numpad3: 'C', Numpad4: 'D' };
  return event.code.startsWith('Numpad') ? keypad[event.code] : numbers[event.key];
}
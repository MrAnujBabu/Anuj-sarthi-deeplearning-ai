import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clampQuizSeconds, useQuizTimerPreference } from '@/lib/quiz-timer-preference';

export function QuizTimerSettings() {
  const timer = useQuizTimerPreference();
  const [draft, setDraft] = useState(String(timer.seconds));
  useEffect(() => { setDraft(String(timer.seconds)); }, [timer.seconds]);
  const commit = () => {
    if (!draft.trim()) { setDraft(String(timer.seconds)); return; }
    const seconds = clampQuizSeconds(Number(draft));
    timer.update(seconds); setDraft(String(seconds));
  };
  return <div className="space-y-3 py-3">
    <div className="flex items-center justify-between gap-4"><span className="text-sm">Quiz timer</span><Select value={timer.override === null ? 'admin' : 'device'} onValueChange={value => timer.update(value === 'admin' ? null : timer.seconds)}><SelectTrigger aria-label="Quiz timer source" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin default</SelectItem><SelectItem value="device">This device</SelectItem></SelectContent></Select></div>
    <div className="flex items-center justify-between gap-4"><label htmlFor="voice-quiz-seconds" className="text-xs text-muted-foreground">Seconds · 0 = off</label><Input id="voice-quiz-seconds" aria-label="Quiz timer seconds" type="number" inputMode="numeric" min={0} max={600} step={1} className="w-28" value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} /></div>
  </div>;
}
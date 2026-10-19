import { Link } from '@tanstack/react-router';
import { BookOpen, Settings, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { STUDY_TEXT_SIZES, useBoldQuestions, useHideChatWidget, useHideTopBar, useNumericAnswerLabels, useQuizKeyboardShortcuts, useStudyTextSize } from '@/lib/quiz-label-preference';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BackupControls } from './backup-controls';
import { Input } from './ui/input';
import { useQuizTimerPreference } from '@/lib/quiz-timer-preference';

export function StudySettings() {
  const [numeric, setNumeric] = useNumericAnswerLabels();
  const [keyboard, setKeyboard] = useQuizKeyboardShortcuts();
  const [bold, setBold] = useBoldQuestions();
  const [size, setSize] = useStudyTextSize();
  const [hidden, setHidden] = useHideChatWidget();
  const [topBarHidden, setTopBarHidden] = useHideTopBar();
  const timer = useQuizTimerPreference();
  return <Dialog>
    <DialogTrigger asChild><Button variant="ghost" className="h-9 w-full justify-start gap-2 px-3"><Settings className="size-4" />Settings</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>Study settings</DialogTitle><DialogDescription>Preferences · this device</DialogDescription></DialogHeader>
      <div className="divide-y divide-border">
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Bold questions</span><Switch checked={bold} onCheckedChange={setBold} aria-label="Bold questions" /></label>
        <div className="flex min-h-16 items-center justify-between gap-4 py-3"><label htmlFor="study-text-size" className="text-sm">Study text size</label><Select value={size} onValueChange={value => { const valid = STUDY_TEXT_SIZES.find(s => s === value); if (valid) setSize(valid); }}><SelectTrigger id="study-text-size" aria-label="Study text size" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{STUDY_TEXT_SIZES.map(value => <SelectItem key={value} value={value}>{value} px</SelectItem>)}</SelectContent></Select></div>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Answer labels <span className="mt-1 block text-xs text-muted-foreground">{numeric ? '1 / 2 / 3 / 4' : 'A / B / C / D'}</span></span><Switch checked={numeric} onCheckedChange={setNumeric} aria-label="Numeric quiz answers on this device" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Keyboard answers <span className="mt-1 block text-xs text-muted-foreground">1–4 · top row + numeric keypad</span></span><Switch checked={keyboard} onCheckedChange={setKeyboard} aria-label="Keyboard quiz answers" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Hide Chat Widget <span className="mt-1 block text-xs text-muted-foreground">Quiz</span></span><Switch checked={hidden} onCheckedChange={setHidden} aria-label="Hide Chat Widget" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Hide top bar <span className="mt-1 block text-xs text-muted-foreground">Full-screen mobile · menu stays in the corner</span></span><Switch checked={topBarHidden} onCheckedChange={setTopBarHidden} aria-label="Hide top bar" /></label>
        <div className="space-y-3 py-3">
          <div className="flex items-center justify-between gap-4"><span className="text-sm">Quiz timer <span className="mt-1 block text-xs text-muted-foreground">Admin default: {timer.adminSeconds ? `${timer.adminSeconds}s` : 'Off'}</span></span><Select value={timer.override === null ? 'admin' : 'device'} onValueChange={value => timer.update(value === 'admin' ? null : timer.seconds)}><SelectTrigger aria-label="Quiz timer source" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin default</SelectItem><SelectItem value="device">This device</SelectItem></SelectContent></Select></div>
          {timer.override !== null && <div className="flex items-center justify-between gap-4"><label htmlFor="device-quiz-seconds" className="text-xs text-muted-foreground">Seconds · 0 = off</label><Input id="device-quiz-seconds" aria-label="Quiz timer seconds" type="number" min={0} max={600} step={1} className="w-28" value={timer.override} onChange={event => timer.update(Number(event.target.value))} /></div>}
        </div>
        <section className="py-4"><h2 className="mb-2 text-sm font-medium">Study data</h2><BackupControls /></section>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" asChild><a href="/SnapSolve-Manual.md" download><BookOpen className="size-4" />Download manual</a></Button>
        <Button variant="ghost" asChild><Link to="/admin"><Shield className="size-4" />Admin</Link></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
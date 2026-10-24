import { Link } from '@tanstack/react-router';
import { BookOpen, Settings, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { STUDY_TEXT_SIZES, useAutoVerify, usePhotoReading, useBoldQuestions, useHideChatWidget, useHideTopBar, useNumericAnswerLabels, useQuizKeyboardShortcuts, useStudyTextSize, useVoiceChoice, VOICE_CHOICES, type VoiceChoiceId, useThemeChoice, type ThemeChoice } from '@/lib/quiz-label-preference';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BackupControls } from './backup-controls';
import { QuizTimerSettings } from './quiz-timer-settings';
import { VoiceSamples } from './voice-samples';
import { VoicePicker } from './voice-picker';

export function StudySettings() {
  const [numeric, setNumeric] = useNumericAnswerLabels();
  const [keyboard, setKeyboard] = useQuizKeyboardShortcuts();
  const [bold, setBold] = useBoldQuestions();
  const [size, setSize] = useStudyTextSize();
  const [hidden, setHidden] = useHideChatWidget();
  const [topBarHidden, setTopBarHidden] = useHideTopBar();
  const [autoVerify, setAutoVerify] = useAutoVerify();
  const [photoReading, setPhotoReading] = usePhotoReading();
  return <Dialog>
    <DialogTrigger asChild><Button variant="ghost" className="h-9 w-full justify-start gap-2 px-3"><Settings className="size-4" />Settings</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>Study settings</DialogTitle><DialogDescription>Preferences · this device</DialogDescription></DialogHeader>
      <div className="divide-y divide-border">
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Highlight key words</span><Switch checked={bold} onCheckedChange={setBold} aria-label="Highlight key words" /></label>
        <div className="flex min-h-16 items-center justify-between gap-4 py-3"><label htmlFor="study-text-size" className="text-sm">Study text size</label><Select value={size} onValueChange={value => { const valid = STUDY_TEXT_SIZES.find(s => s === value); if (valid) setSize(valid); }}><SelectTrigger id="study-text-size" aria-label="Study text size" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{STUDY_TEXT_SIZES.map(value => <SelectItem key={value} value={value}>{value} px</SelectItem>)}</SelectContent></Select></div>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Answer labels <span className="mt-1 block text-xs text-muted-foreground">{numeric ? '1 / 2 / 3 / 4' : 'A / B / C / D'}</span></span><Switch checked={numeric} onCheckedChange={setNumeric} aria-label="Numeric quiz answers on this device" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Keyboard answers <span className="mt-1 block text-xs text-muted-foreground">1–4 · top row + numeric keypad</span></span><Switch checked={keyboard} onCheckedChange={setKeyboard} aria-label="Keyboard quiz answers" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Hide Chat Widget <span className="mt-1 block text-xs text-muted-foreground">Quiz</span></span><Switch checked={hidden} onCheckedChange={setHidden} aria-label="Hide Chat Widget" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Hide top bar <span className="mt-1 block text-xs text-muted-foreground">Full-screen mobile · menu stays in the corner</span></span><Switch checked={topBarHidden} onCheckedChange={setTopBarHidden} aria-label="Hide top bar" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Auto-verify answers <span className="mt-1 block text-xs text-muted-foreground">Gemini 3.1 Pro + GPT-6 Astra check each answer · Claude rules on objections</span></span><Switch checked={autoVerify} onCheckedChange={setAutoVerify} aria-label="Auto-verify answers" /></label>
        <label className="flex min-h-16 items-center justify-between gap-4 py-3"><span className="text-sm">Photo reading <span className="mt-1 block text-xs text-muted-foreground">Gemini 3.1 Pro reads doubt photos first, then the tutor answers</span></span><Switch checked={photoReading} onCheckedChange={setPhotoReading} aria-label="Photo reading by Gemini" /></label>
        <ThemeRow />
        <VoiceChoiceRow />
        <div className="py-4"><VoiceSamples /></div>
        <QuizTimerSettings />
        <section className="py-4"><h2 className="mb-2 text-sm font-medium">Study data</h2><BackupControls /></section>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" asChild><a href="/SnapSolve-Manual.md" download><BookOpen className="size-4" />Download manual</a></Button>
        <Button variant="ghost" asChild><Link to="/admin"><Shield className="size-4" />Admin</Link></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
function VoiceChoiceRow() {
  return (
    <div className="flex min-h-16 flex-col gap-3 py-3">
      <span className="text-sm">Voice mode awaaz <span className="mt-1 block text-xs text-muted-foreground">Next call se lagu hoti hai</span></span>
      <VoicePicker label="Voice mode voice" />
    </div>
  );
}

function ThemeRow() {
  const [theme, setTheme] = useThemeChoice();
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 py-3">
      <span className="text-sm">Theme <span className="mt-1 block text-xs text-muted-foreground">Light · Dark · phone jaisa</span></span>
      <Select value={theme} onValueChange={v => setTheme(v as ThemeChoice)}>
        <SelectTrigger aria-label="Theme" className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">Phone jaisa (auto)</SelectItem></SelectContent>
      </Select>
    </div>
  );
}

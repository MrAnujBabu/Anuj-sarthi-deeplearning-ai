import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, BookOpenText, ImagePlus, Layers, ListOrdered, PartyPopper, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssistantAnswer } from '@/components/assistant-answer';
import { loadPractice, reviewSavedCard } from '@/lib/practice';
import { addCards, cardId, type Card } from '@/lib/srs';
import { completePracticeCard, nextPracticeId, restorePracticeSession, type PracticeSession } from '@/lib/practice-session';
import { useBoldQuestions, useStudyTextSize } from '@/lib/quiz-label-preference';
import { NCERT_BIOLOGY_CHAPTERS, chapterLabel, ncertChapter } from '@/lib/ncert-biology';
import { snippetToCard, structureQuizQueue, type NcertSnippet } from '@/lib/ncert-snippets';
import { pendingFirstMessage } from '@/lib/threads';
import { recordActivity } from '@/lib/study-stats';

export const Route = createFileRoute('/practice')({ head: () => ({ meta: [{ title: 'Saved practice — SnapSolve' },{ name:'description', content:'Revise saved NEET questions and answers without AI credits.' },{ property:'og:title',content:'Saved practice — SnapSolve' },{ property:'og:description',content:'Credit-free active recall from your saved material.' },{ property:'og:type',content:'website' },{name:'twitter:card',content:'summary'}] }), component: Practice });

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

function NcertDeepScan({ onCards }: { onCards: (cards: Card[]) => void }) {
  const navigate = useNavigate();
  const [chapterNo, setChapterNo] = useState('11-8');
  const [state, setState] = useState<ScanState>('idle');
  const [snippets, setSnippets] = useState<NcertSnippet[]>([]);
  const [chapterName, setChapterName] = useState('');
  const [verified, setVerified] = useState(true);
  const [diagramTopic, setDiagramTopic] = useState<string | null>(null);

  async function scan() {
    const [cls, no] = chapterNo.split('-').map(Number);
    setState('scanning');
    try {
      const res = await fetch('/api/ncert-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cls, no }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Scan failed (${res.status})`);
      setSnippets(j.snippets ?? []);
      setChapterName(j.chapter ?? '');
      setVerified(j.verified !== false);
      const cards = (j.snippets ?? []).map((s: NcertSnippet) => snippetToCard(s, j.chapter ?? ''));
      if (cards.length) {
        onCards(cards);
        toast.success(`${cards.length} NCERT lines saved to your deck${j.cached ? ' (from cache)' : ''}.`);
      }
      setState('done');
    } catch (e) {
      setState('error');
      toast.error(e instanceof Error ? e.message : 'The chapter scan failed.');
    }
  }

  async function diagram(s: NcertSnippet) {
    setDiagramTopic(s.topic);
    try {
      const res = await fetch('/api/ncert-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: s.topic, chapter: chapterName, labels: [] }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Diagram failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let final: string | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const ev = JSON.parse(data);
            if (ev.type === 'error' || ev.error) throw new Error(ev.error?.message || 'The diagram was rejected.');
            if (ev.type === 'image_generation.completed' && ev.b64_json) final = ev.b64_json;
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      if (!final) throw new Error('The diagram stream ended without an image.');
      const q = `Diagram — ${s.topic} ke labels batao\n![${s.topic} diagram](data:image/png;base64,${final})`;
      const card: Card = { id: cardId(q), q, a: s.text, topic: `${s.topic} · diagram`, box: 1, due: 0, reviews: 0, lastCorrect: false };
      onCards([card]);
      toast.success('Diagram flashcard saved to your deck.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Diagram generation failed.');
    } finally {
      setDiagramTopic(null);
    }
  }

  function chapterQuiz() {
    const order = structureQuizQueue(snippets);
    if (!order.length) return;
    const [cls, no] = chapterNo.split('-').map(Number);
    const ch = ncertChapter(cls!, no!);
    const list = order.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const id = crypto.randomUUID();
    pendingFirstMessage.set(id, {
      text: `Quiz mode ON — chapter-wise structure quiz. Chapter: ${chapterName || (ch ? chapterLabel(ch) : '')}. Is order mein ek-ek topic par NEET MCQ poochho (har question par topic tag karo):\n${list}\n\nPehle topic se shuru karo.`,
      files: [],
      mode: 'quiz',
    });
    localStorage.setItem(`snapsolve.quiz.${id}`, '1');
    navigate({ to: '/doubt/$threadId', params: { threadId: id } });
  }

  return (
    <section className="mt-10 rounded-2xl border bg-card p-4 shadow-sm md:p-5" aria-label="NCERT Deep Scan">
      <div className="flex items-center gap-2">
        <ScanSearch className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">NCERT Deep Scan</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Chapter online scan hota hai, Gemini lines verify karta hai, phir cards aapki deck mein aate hain.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={chapterNo} onValueChange={setChapterNo}>
          <SelectTrigger className="w-full sm:w-72" aria-label="NCERT chapter">
            <SelectValue placeholder="Chapter chuniye" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {NCERT_BIOLOGY_CHAPTERS.map((c) => (
              <SelectItem key={`${c.cls}-${c.no}`} value={`${c.cls}-${c.no}`}>
                {c.cls === 11 ? 'XI' : 'XII'} · {c.no}. {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={scan} disabled={state === 'scanning'} className="touch-btn">
          {state === 'scanning' ? 'Scanning…' : 'Deep Scan'}
        </Button>
        {snippets.length > 0 && (
          <Button variant="outline" onClick={chapterQuiz} className="touch-btn">
            <ListOrdered className="size-4" /> Chapter-wise quiz
          </Button>
        )}
      </div>
      {state === 'done' && (
        <div className="mt-4 space-y-2">
          {!verified && <p className="text-xs text-muted-foreground">Verify pending — lines abhi council check se guzri nahi, deck mein "verify pending" tag ke saath hain.</p>}
          {snippets.map((s) => (
            <div key={s.topic} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.topic}</div>
                <div className="truncate text-xs text-muted-foreground">{s.text.slice(0, 90)}…</div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" disabled={diagramTopic !== null} onClick={() => diagram(s)}>
                <ImagePlus className="size-4" /> {diagramTopic === s.topic ? 'Ban raha…' : 'Diagram'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Practice() {
  const navigate = useNavigate();
  const [boldQuestions] = useBoldQuestions();
  const [textSize] = useStudyTextSize();
  const [cards,setCards] = useState<Card[]>([]);
  const [session,setSession] = useState<PracticeSession>({queue:[],completed:[]});
  const [saveError,setSaveError] = useState('');
  const [revealed,setRevealed] = useState(false);
  const [ready,setReady] = useState(false);
  const [tally,setTally] = useState({ right: 0, wrong: 0 });
  useEffect(() => {
    const deck = loadPractice(); setCards(deck);
    let saved: unknown = {};
    try { saved = JSON.parse(localStorage.getItem('snapsolve.practice.progress') ?? '{}'); } catch { /* Ignore corrupt progress. */ }
    setSession(restorePracticeSession(deck.map(c=>c.id),saved));
    setReady(true);
  },[]);
  const card = cards.find(c=>c.id===nextPracticeId(session));
  function persistSession(next: PracticeSession) {
    setSession(next);setRevealed(false);
    try { localStorage.setItem('snapsolve.practice.progress',JSON.stringify(next));setSaveError(''); }
    catch { setSaveError('Your review was saved, but session position could not be saved. Keep this page open.'); }
  }
  function grade(correct: boolean) {
    if (!card) return;
    const now = Date.now();
    try { reviewSavedCard(card, correct, now); }
    catch { setSaveError('Browser storage is full. Your review was not saved.');return; }
    recordActivity('review', `${card.id}:${now}`, now);
    setCards(loadPractice());
    setTally((t) => correct ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 });
    persistSession(completePracticeCard(session,card.id));
  }
  function onCards(newCards: Card[]) {
    try {
      addCards(newCards);
      const deck = loadPractice();
      setCards(deck);
      setSession((s) => restorePracticeSession(deck.map((c) => c.id), { queue: s.queue, completed: s.completed }));
    } catch {
      toast.error('Browser storage is full. New cards could not be saved — clear old media first.');
    }
  }
  function restart() {
    setTally({ right: 0, wrong: 0 });
    persistSession({ queue: [...cards].sort((a, b) => a.due - b.due).map(c => c.id), completed: [] });
  }
  function startQuiz() {
    const id = crypto.randomUUID();
    pendingFirstMessage.set(id, { text: 'Quiz mode ON — NEET ke important topics se mujhse ek-ek MCQ poochho.', files: [], mode: 'quiz' });
    localStorage.setItem(`snapsolve.quiz.${id}`, '1');
    navigate({ to: '/doubt/$threadId', params: { threadId: id } });
  }
  // Keyboard: Space/Enter reveals, 1 = needs revision, 2 = remembered. Dialogs and text fields never trigger it.
  useEffect(() => {
    if (!card) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"]')) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input,textarea,select,button,a,[contenteditable="true"],[role="combobox"]')) return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setRevealed(true); return; }
      if (revealed && (event.key === '1' || event.code === 'Numpad1')) { event.preventDefault(); grade(false); }
      if (revealed && (event.key === '2' || event.code === 'Numpad2')) { event.preventDefault(); grade(true); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });

  const now = Date.now();
  const due = cards.filter(c => c.due <= now).length;
  const mastered = cards.filter(c => c.box >= 4).length;
  const boxes = [1, 2, 3, 4, 5].map(b => cards.filter(c => c.box === b).length);
  const done = session.completed.length;
  const total = cards.length;

  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-6 md:py-8">
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" /> SnapSolve</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><h1 className="font-display text-3xl font-semibold">Saved practice</h1><span className="text-sm text-muted-foreground">No AI credits used</span></div>
    {saveError && <p role="alert" className="mt-4 text-destructive">{saveError}</p>}

    {ready && total > 0 && (
      <section aria-label="Deck summary" className="mt-5 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="font-display text-2xl font-semibold tabular-nums">{due}</div><div className="text-xs text-muted-foreground">Aaj due</div></div>
          <div><div className="font-display text-2xl font-semibold tabular-nums">{total}</div><div className="text-xs text-muted-foreground">Deck mein</div></div>
          <div><div className="font-display text-2xl font-semibold tabular-nums">{mastered}</div><div className="text-xs text-muted-foreground">Pakke (box 4–5)</div></div>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Cards by box: ${boxes.join(', ')}`}>
          {boxes.map((n, i) => n > 0 && <div key={i} className="h-full" style={{ width: `${(n / total) * 100}%`, background: `color-mix(in oklab, var(--primary) ${30 + i * 17}%, var(--muted))` }} />)}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>Naye / bhoole</span><span>Pakke yaad</span></div>
      </section>
    )}

    {!ready ? <p className="mt-8 text-muted-foreground">Loading saved material…</p> : !total ? (
      <section className="mt-8 rounded-2xl border border-dashed bg-card/60 p-5 text-center">
        <Layers className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">No saved questions or revision cards yet.</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Har solved doubt aur quiz ka sawaal yahan apne-aap card ban jaata hai. Ya neeche Deep Scan se NCERT lines ke cards banao.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild className="touch-btn"><Link to="/">Doubt poochho</Link></Button>
          <Button variant="outline" className="touch-btn" onClick={startQuiz}>Quiz shuru karo</Button>
        </div>
      </section>
    ) : !card ? (
      <section className="mt-8 rounded-2xl border bg-card p-5 text-center shadow-sm">
        <PartyPopper className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-semibold">Session complete</h2>
        {(tally.right + tally.wrong) > 0 && <p className="mt-2 text-sm"><span className="font-semibold text-primary">{tally.right} yaad the</span> · <span className="font-semibold">{tally.wrong} dobara padhne hain</span></p>}
        <p className="mt-2 text-sm text-muted-foreground">Your revision schedule is saved in this browser. Galat wale cards kal phir aayenge.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button className="touch-btn" onClick={restart}>Practice again</Button>
          <Button variant="outline" asChild className="touch-btn"><Link to="/">Home</Link></Button>
        </div>
      </section>
    ) : <>
      <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span className="min-w-0 truncate">{card.topic}</span><span className="shrink-0 tabular-nums">{done+1} / {total}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Session progress"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} /></div>
      <section className={`study-text study-text-${textSize} mt-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6`}><AssistantAnswer text={card.q} isAnimating={false} boldQuestion={boldQuestions} /></section>
      {revealed ? <section className={`study-text study-text-${textSize} mt-4 rounded-2xl border border-primary/30 bg-accent/40 p-4 md:p-6`}><h2 className="mb-3 font-semibold">Saved answer</h2><AssistantAnswer text={card.a} isAnimating={false} /></section> : null}
      <div className="sticky bottom-0 -mx-5 mt-4 border-t bg-background/95 px-5 py-3 backdrop-blur">
        {revealed ? <div className="grid grid-cols-2 gap-3"><Button variant="outline" className="touch-btn h-11" onClick={()=>grade(false)}>Needs revision <kbd className="ml-1 hidden rounded border px-1 text-[10px] text-muted-foreground md:inline">1</kbd></Button><Button className="touch-btn h-11" onClick={()=>grade(true)}>Remembered <kbd className="ml-1 hidden rounded border border-primary-foreground/40 px-1 text-[10px] md:inline">2</kbd></Button></div>
          : <Button className="touch-btn h-11 w-full" onClick={()=>setRevealed(true)}>Reveal saved answer <kbd className="ml-1 hidden rounded border border-primary-foreground/40 px-1 text-[10px] md:inline">Space</kbd></Button>}
      </div>
    </>}
    <NcertDeepScan onCards={onCards} />
    <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><BookOpenText className="size-3.5" /> Deep Scan AI credits use karta hai; saved cards ka revision hamesha free hai.</p>
  </main>;
}

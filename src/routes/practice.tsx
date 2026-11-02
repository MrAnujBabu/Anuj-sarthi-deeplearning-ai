import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BookOpenText, ImagePlus, ListOrdered, ScanSearch } from 'lucide-react';
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
  const [boldQuestions] = useBoldQuestions();
  const [textSize] = useStudyTextSize();
  const [cards,setCards] = useState<Card[]>([]);
  const [session,setSession] = useState<PracticeSession>({queue:[],completed:[]});
  const [saveError,setSaveError] = useState('');
  const [revealed,setRevealed] = useState(false);
  const [ready,setReady] = useState(false);
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
    try { reviewSavedCard(card, correct, Date.now()); }
    catch { setSaveError('Browser storage is full. Your review was not saved.');return; }
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
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
    <Link to="/" className="text-primary">← SnapSolve</Link>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Saved practice</h1><span className="text-sm text-muted-foreground">No AI credits used</span></div>
    {saveError && <p role="alert" className="mt-4 text-destructive">{saveError}</p>}
    {!ready ? <p className="mt-8">Loading saved material…</p> : !cards.length ? <p className="mt-8">No saved questions or revision cards yet.</p> : !card ? <div className="mt-10"><h2 className="text-2xl">Session complete</h2><p className="mt-3">Your revision schedule is saved in this browser.</p><Button className="mt-5" onClick={()=>persistSession({queue:cards.map(c=>c.id),completed:[]})}>Practice again</Button></div> : <>
      <p className="mt-6 text-sm text-muted-foreground">{session.completed.length+1} / {cards.length} · {card.topic}</p>
      <section className={`study-text study-text-${textSize} mt-4 border-y py-6`}><AssistantAnswer text={card.q} isAnimating={false} boldQuestion={boldQuestions} /></section>
      {revealed ? <section className={`study-text study-text-${textSize} mt-6`}><h2 className="mb-3 font-semibold">Saved answer</h2><AssistantAnswer text={card.a} isAnimating={false} /><div className="mt-8 flex flex-wrap gap-3"><Button variant="outline" onClick={()=>grade(false)}>Needs revision</Button><Button onClick={()=>grade(true)}>Remembered</Button></div></section> : <Button className="mt-6" onClick={()=>setRevealed(true)}>Reveal saved answer</Button>}
    </>}
    <NcertDeepScan onCards={onCards} />
    <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><BookOpenText className="size-3.5" /> Deep Scan AI credits use karta hai; saved cards ka revision hamesha free hai.</p>
  </main>;
}

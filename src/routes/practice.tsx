import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AssistantAnswer } from '@/components/assistant-answer';
import { loadPractice, reviewSavedCard } from '@/lib/practice';
import type { Card } from '@/lib/srs';
import { completePracticeCard, nextPracticeId, restorePracticeSession, type PracticeSession } from '@/lib/practice-session';
export const Route = createFileRoute('/practice')({ head: () => ({ meta: [{ title: 'Saved practice — SnapSolve' },{ name:'description', content:'Revise saved NEET questions and answers without AI credits.' },{ property:'og:title',content:'Saved practice — SnapSolve' },{ property:'og:description',content:'Credit-free active recall from your saved material.' },{ property:'og:type',content:'website' },{name:'twitter:card',content:'summary'}] }), component: Practice });
function Practice() {
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
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
    <Link to="/" className="text-primary">← SnapSolve</Link>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Saved practice</h1><span className="text-sm text-muted-foreground">No AI credits used</span></div>
    {saveError && <p role="alert" className="mt-4 text-destructive">{saveError}</p>}
    {!ready ? <p className="mt-8">Loading saved material…</p> : !cards.length ? <p className="mt-8">No saved questions or revision cards yet.</p> : !card ? <div className="mt-10"><h2 className="text-2xl">Session complete</h2><p className="mt-3">Your revision schedule is saved in this browser.</p><Button className="mt-5" onClick={()=>persistSession({queue:cards.map(c=>c.id),completed:[]})}>Practice again</Button></div> : <>
      <p className="mt-6 text-sm text-muted-foreground">{session.completed.length+1} / {cards.length} · {card.topic}</p>
      <section className="mt-4 border-y py-6"><AssistantAnswer text={card.q} isAnimating={false} /></section>
      {revealed ? <section className="mt-6"><h2 className="mb-3 font-semibold">Saved answer</h2><AssistantAnswer text={card.a} isAnimating={false} /><div className="mt-8 flex flex-wrap gap-3"><Button variant="outline" onClick={()=>grade(false)}>Needs revision</Button><Button onClick={()=>grade(true)}>Remembered</Button></div></section> : <Button className="mt-6" onClick={()=>setRevealed(true)}>Reveal saved answer</Button>}
    </>}
  </main>;
}
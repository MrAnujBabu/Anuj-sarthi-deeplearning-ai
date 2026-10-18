import { loadThreads, type Thread } from './threads';
import { restoreDocs } from './doc-store';
import { loadCards, type Card } from './srs';
export type StudyBackup = { format: 'snapsolve-study'; version: 1; createdAt: string; threads: Thread[]; cards: Card[] };
export function parseStudyBackup(raw: string): StudyBackup {
  const value = JSON.parse(raw) as StudyBackup;
  if (value.format !== 'snapsolve-study' || value.version !== 1 || !Array.isArray(value.threads) || !Array.isArray(value.cards)) throw new Error('Choose a SnapSolve study backup.');
  for (const t of value.threads) {
    if (typeof t.id !== 'string' || typeof t.title !== 'string' || !Number.isFinite(t.updatedAt) || !Array.isArray(t.messages)) throw new Error('Invalid saved conversation.');
    for (const m of t.messages) {
      if (typeof m.id !== 'string' || !['user','assistant','system'].includes(m.role) || !Array.isArray(m.parts)) throw new Error('Invalid saved message.');
      for (const p of m.parts) {
        if (p.type === 'text' && typeof p.text !== 'string') throw new Error('Invalid saved text.');
        if (p.type === 'file' && (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(p.url))) throw new Error('Backup attachments must be embedded photos or PDFs.');
      }
    }
  }
  for (const c of value.cards) if (typeof c.id !== 'string' || typeof c.q !== 'string' || typeof c.a !== 'string' || typeof c.topic !== 'string' || !Number.isInteger(c.box) || c.box < 1 || c.box > 5 || !Number.isFinite(c.due) || !Number.isFinite(c.reviews) || typeof c.lastCorrect !== 'boolean') throw new Error('Invalid revision card.');
  return value;
}
export async function exportStudy() {
  const threads = await Promise.all(loadThreads().map(async t => ({...t, messages: await restoreDocs(t.messages)})));
  const backup: StudyBackup = { format: 'snapsolve-study', version: 1, createdAt: new Date().toISOString(), threads, cards: loadCards() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], {type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='snapsolve-study-backup.json'; a.click(); URL.revokeObjectURL(url);
}
export function importStudy(backup: StudyBackup) {
  const threads = new Map(loadThreads().map(t=>[t.id,t]));
  backup.threads.forEach(t=>{if(!threads.has(t.id))threads.set(t.id,t);});
  const cards = new Map(loadCards().map(c=>[c.id,c]));
  backup.cards.forEach(c=>{if(!cards.has(c.id))cards.set(c.id,c);});
  const oldThreads=localStorage.getItem('snapsolve.threads.v1');
  const oldCards=localStorage.getItem('snapsolve.cards.v1');
  try {
    localStorage.setItem('snapsolve.threads.v1',JSON.stringify([...threads.values()]));
    localStorage.setItem('snapsolve.cards.v1',JSON.stringify([...cards.values()]));
  } catch {
    if(oldThreads===null)localStorage.removeItem('snapsolve.threads.v1');else localStorage.setItem('snapsolve.threads.v1',oldThreads);
    if(oldCards===null)localStorage.removeItem('snapsolve.cards.v1');else localStorage.setItem('snapsolve.cards.v1',oldCards);
    throw new Error('Not enough browser storage. Nothing was imported; keep your backup safe.');
  }
  window.dispatchEvent(new Event('snapsolve:threads')); window.dispatchEvent(new Event('snapsolve:cards'));
}
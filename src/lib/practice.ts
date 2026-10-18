import { reviewLocalCard, cardId, loadCards, type Card } from './srs';
import { loadThreads, type Thread } from './threads';
import { stripCards, parseCards, parseQuizTag } from './srs';
export function savedPractice(cards: Card[], threads: Thread[]): Card[] {
  const map = new Map(cards.map(c => [c.id, c]));
  for (const thread of threads) {
    let question = '';
    for (const m of thread.messages) {
      const text = m.parts.filter(p => p.type === 'text').map(p => p.type === 'text' ? p.text : '').join('\n');
      if (m.role === 'user') { question = text; continue; }
      if (m.role !== 'assistant' || !question.trim()) continue;
      if (parseQuizTag(text) || parseCards(text).length) { question = ''; continue; }
      const answer = stripCards(text).trim();
      if (!answer || answer.startsWith('[AI_')) continue;
      const id = cardId(question);
      if (!map.has(id)) map.set(id, { id, q: question, a: answer, topic: thread.title, box: 1, due: 0, reviews: 0, lastCorrect: false });
      question = '';
    }
  }
  return [...map.values()].sort((a,b) => a.due-b.due);
}
export function loadPractice() { return savedPractice(loadCards(), loadThreads()); }
export const reviewSavedCard = reviewLocalCard;

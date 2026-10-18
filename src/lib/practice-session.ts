export type PracticeSession = { queue: string[]; completed: string[] };

export function restorePracticeSession(ids: string[], value: unknown): PracticeSession {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const available = new Set(ids);
  const saved = Array.isArray(raw['queue']) ? raw['queue'].filter((id): id is string => typeof id === 'string' && available.has(id)) : [];
  const queue = [...new Set([...saved, ...ids])];
  const completed = Array.isArray(raw['completed']) ? raw['completed'].filter((id): id is string => typeof id === 'string' && available.has(id)) : [];
  return { queue, completed: [...new Set(completed)] };
}

export function completePracticeCard(session: PracticeSession, id: string): PracticeSession {
  return { ...session, completed: [...new Set([...session.completed, id])] };
}

export function nextPracticeId(session: PracticeSession) {
  return session.queue.find(id => !session.completed.includes(id));
}
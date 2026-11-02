import type { LiveEvent } from '@/hooks/use-live-voice';

export type VoiceQuizQuestion = { id: string; text: string; labels: Record<string, string> };
export type VoiceQuizState = { question: VoiceQuizQuestion | null; pending: VoiceQuizQuestion | null; picked?: string | undefined; retry: number; ready: boolean };
export const initialVoiceQuizState: VoiceQuizState = { question: null, pending: null, retry: 0, ready: false };

/** Publish a complete question/options pair only once its own playback is ready. */
export function reduceVoiceQuiz(state: VoiceQuizState, event: LiveEvent): VoiceQuizState {
  if (event.type === 'app.closed' || (event.type === 'app.settings.applied' && (event['prefs'] as { quiz?: boolean } | undefined)?.quiz === false)) return initialVoiceQuizState;
  if (event.type === 'app.quiz.question' && typeof event.questionId === 'string' && typeof event['text'] === 'string' && event.labels && ['A', 'B', 'C', 'D'].every(key => typeof event.labels?.[key] === 'string' && event.labels[key].trim())) {
    if (state.question?.id === event.questionId || state.pending?.id === event.questionId) return state;
    return { ...state, pending: { id: event.questionId, text: event['text'], labels: event.labels } };
  }
  if (event.type === 'app.quiz.playback.ready' || event.type === 'app.quiz.manual.ready') {
    if (state.pending?.id !== event.questionId) return state;
    return { question: state.pending, pending: null, picked: undefined, retry: 0, ready: true };
  }
  if (event.questionId !== state.question?.id || state.pending) return state;
  if (event.type === 'app.quiz.submitted' || event.type === 'app.quiz.accepted') {
    return state.picked && state.picked !== event.answer ? state : { ...state, picked: event.answer };
  }
  if (event.type === 'app.quiz.rejected' && event['retryable'] !== false) {
    return { ...state, picked: undefined, retry: state.retry + 1 };
  }
  return state;
}
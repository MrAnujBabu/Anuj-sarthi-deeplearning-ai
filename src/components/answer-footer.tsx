import { useEffect, useRef, useState } from 'react';
import { MessageActions } from '@/components/message-actions';
import { VerifyButton, VerifyPanel } from '@/components/verify-card';
import { useCouncil } from '@/lib/verify-client';

/** Actions under one tutor answer plus its Gemini + GPT + Claude answer check. */
export function AnswerFooter({ messageId, text, question, images, canVerify, autoStart }: {
  messageId: string;
  text: string;
  question: string;
  images: string[];
  /** False in quiz mode or when there is no question to check against. */
  canVerify: boolean;
  /** Start automatically (auto-verify ON and this answer just finished). */
  autoStart: boolean;
}) {
  const { state, start, stop } = useCouncil({ messageId, question, answer: text, images }, { autoStart, enabled: canVerify });
  // Results loaded from this device's cache stay folded; a check run now opens when it finishes.
  const [open, setOpen] = useState(false);
  const prev = useRef(state.status);
  useEffect(() => {
    if (prev.current === 'running' && state.status === 'done') setOpen(true);
    prev.current = state.status;
  }, [state.status]);
  const showPanel = canVerify && state.status !== 'idle' && (state.status !== 'done' || open);
  return (
    <>
      <MessageActions messageId={messageId} text={text}>
        {canVerify && (
          <VerifyButton
            state={state}
            open={open}
            onStart={() => { setOpen(true); void start(); }}
            onStop={stop}
            onToggle={() => setOpen((o) => !o)}
          />
        )}
      </MessageActions>
      {showPanel && <VerifyPanel state={state} onStart={() => { setOpen(true); void start(); }} onStop={stop} />}
    </>
  );
}

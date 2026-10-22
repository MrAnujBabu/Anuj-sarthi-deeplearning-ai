import { useEffect, useRef } from 'react';

/** A switch enabled during an answer starts exactly once after that answer finishes. */
export function useQuizStart(ready: boolean, start: () => void) {
  const pending = useRef(false);
  const latest = useRef(start);
  latest.current = start;
  useEffect(() => {
    if (!ready || !pending.current) return;
    pending.current = false;
    latest.current();
  }, [ready]);
  return (on: boolean) => {
    pending.current = on;
    if (on && ready) {
      pending.current = false;
      latest.current();
    }
  };
}
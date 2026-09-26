import { useCallback, useEffect, useRef, useState } from 'react';

export function useNotice(durationMs = 3500) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(null), durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const notice = message ? (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 bg-text text-white text-sm rounded-lg shadow-lg border border-border"
    >
      {message}
    </div>
  ) : null;

  return { show, notice };
}

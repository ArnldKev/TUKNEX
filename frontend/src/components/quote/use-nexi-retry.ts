'use client';
import { useEffect, useRef, useState } from 'react';
import { AiRequestError } from '@/lib/quote/ai-errors';

export function useNexiRetry() {
  const deadline = useRef(0);
  const [remaining, setRemaining] = useState(0);
  const waiting = remaining > 0;

  useEffect(() => {
    if (!waiting) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  return {
    waiting,
    label: remaining >= 60
      ? 'Reintentar en ' + Math.ceil(remaining / 60) + ' min'
      : 'Reintentar en ' + remaining + ' s',
    isWaiting: () => Date.now() < deadline.current,
    remember(error: unknown) {
      if (!(error instanceof AiRequestError) || !error.retryAfterSeconds) return;
      deadline.current = Date.now() + error.retryAfterSeconds * 1000;
      setRemaining(error.retryAfterSeconds);
    },
  };
}

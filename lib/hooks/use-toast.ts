'use client';

import { useEffect, useState } from 'react';

export function useToast(duration = 2800) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, message]);

  return [message, setMessage] as const;
}

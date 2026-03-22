'use client';

import { useEffect, useState } from 'react';

export function useIsMobileViewport(breakpoint = 768) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    function updateViewportState() {
      setIsMobileViewport(window.innerWidth < breakpoint);
    }

    updateViewportState();
    window.addEventListener('resize', updateViewportState);

    return () => {
      window.removeEventListener('resize', updateViewportState);
    };
  }, [breakpoint]);

  return isMobileViewport;
}

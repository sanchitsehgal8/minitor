'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query. Starts false so the server render and the first
 * client render agree; the real value arrives in an effect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * framer's useReducedMotion, made safe to branch on during render.
 *
 * framer reads the media query synchronously on the client's first render,
 * but the server cannot know it — so rendering different text or styles from
 * it caused a hydration mismatch (and a full client re-render) for exactly the
 * visitors who asked for less motion. This reports false until mounted, then
 * the real preference, so both renders agree.
 */
export function usePrefersReducedMotion(): boolean {
  const prefersReducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  return isMounted && prefersReducedMotion === true;
}

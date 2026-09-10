'use client';

import { MotionConfig } from 'framer-motion';

/**
 * `reducedMotion="user"` makes Framer Motion honour the OS setting for every
 * animation in the tree (spec §7) — transforms and opacity snap to their end
 * state instead of tweening, so nothing is left mid-animation or invisible.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value the first time it scrolls into view,
 * and re-tweens from wherever it is when the value changes. Under reduced
 * motion it renders the final value immediately.
 */
export function AnimatedNumber({
  value,
  duration = 1.2,
  format = (n) => Math.round(n).toLocaleString('en-GB'),
  className,
}: {
  readonly value: number;
  readonly duration?: number;
  readonly format?: (value: number) => string;
  readonly className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const prefersReducedMotion = useReducedMotion();
  // Always 0 on the first render, server and client alike: seeding it from the
  // reduced-motion preference made the two disagree and broke hydration. The
  // effect below jumps straight to the value when motion is reduced.
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      current.current = value;
      setDisplay(value);
      return;
    }
    if (!isInView) return;
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        current.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [value, isInView, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className={`tabular ${className ?? ''}`}>
      {format(display)}
    </span>
  );
}

'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

/**
 * Fades and lifts its children into place the first time they scroll into
 * view. Under reduced motion the provider snaps it to the end state.
 */
export function Reveal({
  delay = 0,
  y = 24,
  children,
  ...rest
}: HTMLMotionProps<'div'> & { readonly delay?: number; readonly y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

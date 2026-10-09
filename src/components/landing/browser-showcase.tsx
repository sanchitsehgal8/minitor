'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

import { ChromeReplica } from '@/components/landing/chrome-replica';
import { Reveal } from '@/components/landing/reveal';

/**
 * The replica, presented: it rises out of a tilt and settles flat as it
 * scrolls into the centre of the viewport, like a window being set down.
 */
export function BrowserShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const glow = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="replica" className="relative scroll-mt-24 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">The browser shell</p>
          <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
            A browser that <span className="italic text-verdigris-glow">shows its working.</span>
          </h2>
          <p className="mt-5 text-lg text-ash-light">
            Tabs, history, bookmarks and an address bar — with a live privacy console beside every
            page that says whether a block really happened or was modelled.
          </p>
        </Reveal>

        <div ref={ref} className="relative mt-14 [perspective:1600px]">
          <motion.div
            aria-hidden="true"
            style={{ opacity: glow }}
            className="pointer-events-none absolute inset-x-[10%] -bottom-10 top-1/3 -z-10 rounded-full bg-verdigris/25 blur-[100px]"
          />
          <motion.div style={{ rotateX, scale, y }} className="origin-top will-change-transform">
            <ChromeReplica />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

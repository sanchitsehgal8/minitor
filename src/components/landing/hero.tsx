'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

import { NetworkGlobe } from '@/components/landing/network-globe';
import { ArrowRightIcon } from '@/components/ui/icons';
import { useMediaQuery } from '@/hooks/use-media-query';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // The globe drifts and dims as the page scrolls away, giving the hero depth.
  const globeY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const globeOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  // On narrow screens the globe sits below the copy, so a scroll-linked fade
  // would dim it before it is ever seen; the parallax is desktop-only.
  const isWide = useMediaQuery('(min-width: 1024px)');

  return (
    <section ref={ref} className="relative isolate overflow-hidden pb-20 pt-32 lg:min-h-[100svh] lg:pb-24 lg:pt-44">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative z-10"
        >
          <h1 className="font-display text-[44px] leading-[0.98] text-white sm:text-5xl sm:leading-[0.98] lg:text-6xl lg:leading-[0.95]">
            Browse privately.
            <span className="block text-ash-light">Understand what happens behind the page.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg text-ash-light">
            MiniTor is a privacy-focused browser experience with website privacy analysis built in:
            scan a site to see the domains it contacts, what would be blocked, and an explainable
            privacy score. This is the web demo, and it tells you plainly which parts are measured
            and which are modelled.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create an account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              Log in
            </Link>
          </div>

          <p className="mt-8 max-w-md text-sm text-ash">
            Four of the five original objectives work for real here. The fifth needs access a hosted
            web page cannot have. We say{' '}
            <a href="#honesty" className="text-parchment underline decoration-white/25 underline-offset-4 hover:decoration-white/60">
              which is which
            </a>{' '}
            on this page and inside the app.
          </p>
        </motion.div>

        <motion.div
          style={isWide ? { y: globeY, opacity: globeOpacity } : undefined}
          className="relative mx-auto aspect-square w-full max-w-[640px] lg:-mr-10"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
            className="absolute inset-0"
          >
            <div aria-hidden="true" className="absolute inset-[26%] rounded-full bg-verdigris/15 blur-[80px]" />
            <NetworkGlobe />
          </motion.div>

          <p className="absolute inset-x-0 -bottom-4 mx-auto max-w-sm text-center font-mono text-[10px] leading-relaxed text-ash-dim">
            Illustration: onion routing, the idea MiniTor is named after. The web demo does not
            route your traffic.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

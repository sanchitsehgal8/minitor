'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

import { NetworkGlobe } from '@/components/landing/network-globe';
import { ArrowRightIcon, LockIcon, MaskIcon, ShieldIcon } from '@/components/ui/icons';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Splits a line into words that blur up into place one after another. */
function RevealWords({
  text,
  delay = 0,
  className = '',
}: {
  readonly text: string;
  readonly delay?: number;
  readonly className?: string;
}) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={`inline-block ${className}`}
            initial={{ y: '100%', opacity: 0, filter: 'blur(8px)' }}
            animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: delay + index * 0.07, ease: EASE }}
          >
            {word}
          </motion.span>
          {' '}
        </span>
      ))}
    </>
  );
}

function FloatingCard({
  className,
  delay,
  children,
}: {
  readonly className: string;
  readonly delay: number;
  readonly children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
        className="glass whitespace-nowrap rounded-xl px-3.5 py-2.5"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // The globe drifts and dims as the page scrolls away, giving the hero depth.
  const globeY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const globeOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  // On narrow screens the globe sits below the copy, so a scroll-linked fade
  // would dim it before it is ever seen; the parallax is desktop-only.
  const isWide = useMediaQuery('(min-width: 1024px)');

  return (
    <section ref={ref} className="grain relative isolate overflow-hidden pb-20 pt-32 lg:min-h-[100svh] lg:pb-24 lg:pt-40">
      {/* Atmosphere: a verdigris dawn top-left, a faint amber ember low-right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-verdigris/20 blur-[120px]" />
        <div className="absolute -right-20 top-1/3 h-[34rem] w-[34rem] rounded-full bg-verdigris-bright/10 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-amber/10 blur-[120px]" />
        <div className="bg-grid mask-radial absolute inset-0 opacity-60" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-6">
        <motion.div style={isWide ? { y: copyY } : undefined} className="relative z-10">
          <motion.a
            href="#honesty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-ash-light backdrop-blur-md transition-colors duration-300 hover:border-white/20 hover:text-white"
          >
            <span className="whitespace-nowrap rounded-full bg-verdigris/20 px-2 py-0.5 font-mono text-verdigris-glow">
              Web demo
            </span>
            <span className="hidden sm:inline">Every feature labelled working, partial or simulated</span>
            <span className="sm:hidden">Every feature honestly labelled</span>
            <ArrowRightIcon className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </motion.a>

          <h1 className="mt-7 font-display text-[44px] leading-[0.98] text-white sm:text-5xl sm:leading-[0.98] lg:text-6xl lg:leading-[0.95]">
            {/* The gradient goes on each word: background-clip:text does not
                reach through the transformed spans the reveal animates. */}
            <span className="block">
              <RevealWords text="Browse privately." delay={0.1} className="text-gradient" />
            </span>
            <span className="block text-ash-light">
              <RevealWords text="Understand what happens" delay={0.3} />
              <RevealWords text="behind the page." delay={0.58} className="text-gradient-verdigris italic" />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.75, ease: EASE }}
            className="mt-7 max-w-xl text-lg text-ash-light"
          >
            MiniTor is a privacy-focused browser experience with website privacy analysis built in:
            scan a site to see the domains it contacts, what would be blocked, and an explainable
            privacy score. This is the web demo, and it tells you plainly which parts are measured
            and which are modelled.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create an account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              Log in
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.15 }}
            className="mt-8 max-w-md border-l border-white/10 pl-4 text-sm text-ash"
          >
            Four of the five original objectives work for real here. The fifth needs access a hosted
            web page cannot have. We say which is which on this page and inside the app.
          </motion.p>
        </motion.div>

        <motion.div
          style={isWide ? { y: globeY, opacity: globeOpacity } : undefined}
          className="relative mx-auto aspect-square w-full max-w-[640px] lg:-mr-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
            className="absolute inset-0"
          >
            <div
              aria-hidden="true"
              className="absolute inset-[22%] rounded-full bg-verdigris/25 blur-[80px]"
            />
            <NetworkGlobe />
          </motion.div>

          <FloatingCard className="left-0 top-[14%] sm:left-[2%]" delay={1.1}>
            <p className="flex items-center gap-2 text-xs text-parchment">
              <LockIcon className="h-3.5 w-3.5 text-verdigris-bright" />
              HTTPS-only
              <span className="chip border-verdigris-bright/30 text-verdigris-glow">enforced</span>
            </p>
          </FloatingCard>

          <FloatingCard className="right-0 top-[38%] sm:right-[4%]" delay={1.3}>
            <p className="font-mono text-xs text-ash">on /demo/tracker-heavy</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-parchment">
              <ShieldIcon className="h-3.5 w-3.5 text-amber-glow" />
              doubleclick.net
              <span className="chip border-amber/35 text-amber-glow">blocked</span>
            </p>
          </FloatingCard>

          <FloatingCard className="bottom-[12%] left-[6%]" delay={1.5}>
            <p className="flex items-center gap-2 text-xs text-parchment">
              <MaskIcon className="h-3.5 w-3.5 text-amber-glow" />
              Private tab
              <span className="font-mono text-ash">0 rows written</span>
            </p>
          </FloatingCard>

          <p className="absolute inset-x-0 -bottom-4 mx-auto max-w-sm text-center font-mono text-[10px] leading-relaxed text-ash-dim">
            Illustration: onion routing, the idea MiniTor is named after. The web demo does not
            route your traffic.
          </p>
        </motion.div>
      </div>

      <motion.a
        href="#replica"
        aria-label="Scroll to the browser demo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <span className="flex h-9 w-5 justify-center rounded-full border border-white/15 pt-1.5">
          <motion.span
            className="h-1.5 w-0.5 rounded-full bg-parchment"
            animate={prefersReducedMotion ? undefined : { y: [0, 10, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.a>
    </section>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { BAND, CARD, EASE_OUT, EASE_UI, Meter } from '@/components/privacy/privacy-primitives';
import { ScoreDial } from '@/components/privacy/score-dial';
import { ArrowRightIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { scoreBand } from '@/lib/scan/privacy-score';
import type { PrivacyScore } from '@/lib/scan/types';

/**
 * The privacy score with its per-category breakdown (spec §4).
 *
 * Each category expands to the explanation the scoring service generated, so
 * the number is always accountable to something the user can read.
 */
export function PrivacyScoreCard({ score }: { readonly score: PrivacyScore }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const band = BAND[scoreBand(score.total)];
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className={`${CARD} p-5`}>
      {/* Band-coloured light pooling behind the dial. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{ background: band.glow, opacity: 0.12 }}
      />

      <div className="relative">
        <ScoreDial score={score.total} label="Privacy score" size={116} />

        {/*
          Composition strip: each segment's width is the factor's weight and its
          fill is the factor's score, so the lit area is exactly the total. It
          shows how the headline number is assembled without new arithmetic.
        */}
        <div aria-hidden="true" className="mt-5 flex h-2 gap-0.5">
          {score.categories.map((category, index) => {
            const tone = BAND[scoreBand(category.score)];
            return (
              <div
                key={category.id}
                className="relative h-full overflow-hidden rounded-full bg-white/[0.06]"
                style={{ width: `${category.weight * 100}%` }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundImage: `linear-gradient(90deg, ${tone.from}, ${tone.to})` }}
                  initial={prefersReducedMotion ? false : { width: '0%' }}
                  animate={{ width: `${category.score}%` }}
                  transition={{ duration: 0.9, delay: 0.35 + index * 0.07, ease: EASE_OUT }}
                />
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ash">
          Weighted from the five factors below. Select one to see how it was calculated.
        </p>

        <ul className="mt-4 space-y-1.5">
          {score.categories.map((category, index) => {
            const isOpen = openId === category.id;
            const tone = BAND[scoreBand(category.score)];
            return (
              <li
                key={category.id}
                className={`overflow-hidden rounded-lg border transition-colors duration-200 ${
                  isOpen ? 'border-white/[0.1] bg-white/[0.035]' : 'border-white/[0.05] bg-black/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : category.id)}
                  aria-expanded={isOpen}
                  className="group w-full px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <motion.span
                        aria-hidden="true"
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.25, ease: EASE_UI }}
                        className="text-ash-dim transition-colors duration-150 group-hover:text-ash-light"
                      >
                        <ArrowRightIcon className="h-3 w-3" />
                      </motion.span>
                      <span className="truncate font-body text-xs font-medium text-parchment">
                        {category.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="chip border-transparent bg-white/[0.04] text-ash">
                        {Math.round(category.weight * 100)}%
                        {/* Full wording for screen readers everywhere; visible from sm up. */}
                        <span className="max-sm:sr-only"> of the total</span>
                      </span>
                      <span className={`technical tabular w-7 text-right text-sm ${tone.text}`}>
                        {category.score}
                      </span>
                    </span>
                  </div>
                  <Meter
                    value={category.score}
                    from={tone.from}
                    to={tone.to}
                    delay={0.25 + index * 0.06}
                    className="mt-2 h-1"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE_UI }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-white/[0.06] px-3 py-3 pl-8 text-xs leading-relaxed text-ash-light">
                        {category.explanation}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { ScoreDial } from '@/components/privacy/score-dial';
import { scoreBand } from '@/lib/scan/privacy-score';
import type { PrivacyScore } from '@/lib/scan/types';

const BAR_COLOR: Record<ReturnType<typeof scoreBand>, string> = {
  strong: 'bg-verdigris',
  mixed: 'bg-amber',
  poor: 'bg-amber-dim',
};

/**
 * The privacy score with its per-category breakdown (spec §4).
 *
 * Each category expands to the explanation the scoring service generated, so
 * the number is always accountable to something the user can read.
 */
export function PrivacyScoreCard({ score }: { readonly score: PrivacyScore }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <ScoreDial score={score.total} label="Privacy score" />

      <p className="mt-3 text-xs leading-relaxed text-ash">
        Weighted from the four factors below. Select one to see how it was calculated.
      </p>

      <ul className="mt-4 space-y-1">
        {score.categories.map((category) => {
          const isOpen = openId === category.id;
          return (
            <li key={category.id} className="rounded-md border border-ink-edge">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : category.id)}
                aria-expanded={isOpen}
                className="w-full px-3 py-2.5 text-left transition-colors duration-150 hover:bg-ink"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-body text-xs text-parchment">{category.label}</span>
                  <span className="technical shrink-0 text-xs text-parchment">{category.score}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-sunken">
                  <div
                    className={`h-full rounded-full ${BAR_COLOR[scoreBand(category.score)]}`}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                <span className="technical mt-1 block text-xs text-ash-dim">
                  {Math.round(category.weight * 100)}% of the total
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-ink-edge px-3 py-2.5 text-xs leading-relaxed text-ash-light">
                      {category.explanation}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

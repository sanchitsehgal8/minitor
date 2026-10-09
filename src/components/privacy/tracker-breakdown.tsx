'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import {
  CARD,
  CATEGORY_COLOR,
  CardHeader,
  EASE_OUT,
  Meter,
} from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { ArrowRightIcon, CheckIcon, EyeIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { TrackerCategory } from '@/lib/privacy/tracker-blocklist';
import type { TrackerFinding } from '@/lib/scan/types';

const CATEGORY_LABEL: Record<TrackerCategory, string> = {
  analytics: 'Analytics',
  advertising: 'Advertising',
  social: 'Social tracking',
  // Spec §8's "Other" row. Named for what it actually is rather than left as a
  // vague bucket — fingerprinting is the category outside the usual trio.
  fingerprinting: 'Other — fingerprinting',
};

/** Fixed display order, so the breakdown does not reshuffle between scans. */
const CATEGORY_ORDER: readonly TrackerCategory[] = [
  'analytics',
  'advertising',
  'social',
  'fingerprinting',
];

/**
 * Tracker findings, grouped by category (spec §8).
 *
 * Operator names come from MiniTor's own blocklist metadata and describe which
 * company runs the domain — they are not a claim about the scanned site's
 * business relationships.
 */
export function TrackerBreakdown({
  trackers,
  onSelectDomain,
}: {
  readonly trackers: readonly TrackerFinding[];
  readonly onSelectDomain: (domain: string) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const groups = useMemo(() => {
    const byCategory = new Map<TrackerCategory, { count: number; requests: number }>();
    for (const tracker of trackers) {
      const existing = byCategory.get(tracker.category) ?? { count: 0, requests: 0 };
      byCategory.set(tracker.category, {
        count: existing.count + 1,
        requests: existing.requests + tracker.requests,
      });
    }
    return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map(
      (category) => [category, byCategory.get(category)!] as const,
    );
  }, [trackers]);

  const maxRequests = Math.max(1, ...groups.map(([, value]) => value.requests));
  const blocked = trackers.filter((tracker) => tracker.action === 'block').length;

  if (trackers.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-verdigris-bright/20 bg-verdigris-bright/[0.05] p-4">
        <CardHeader
          tone="good"
          icon={<CheckIcon className="h-3.5 w-3.5" />}
          title="No known trackers observed"
          description={
            <span className="text-ash-light">
              No domains from MiniTor’s blocklist were contacted in this scan. That blocklist covers
              32 well-known domains, so this is not proof that a site does no tracking at all.
            </span>
          }
        />
      </section>
    );
  }

  return (
    <section className={CARD}>
      <CardHeader
        icon={<EyeIcon className="h-3.5 w-3.5" />}
        title="Trackers observed"
        description={
          <>
            {trackers.length} {trackers.length === 1 ? 'domain' : 'domains'} matched MiniTor’s
            blocklist in this scan.
          </>
        }
      />

      <dl className="mt-4 flex items-end gap-6">
        <div className="flex flex-col-reverse">
          <dt className="eyebrow mt-1.5">Tracker domains</dt>
          <dd className="font-display text-5xl leading-none text-white">
            <AnimatedNumber value={trackers.length} />
          </dd>
        </div>
        <div className="flex flex-col-reverse pb-0.5">
          <dt className="eyebrow mt-1.5">Blocked</dt>
          <dd className="technical tabular text-lg leading-none text-amber">
            <AnimatedNumber value={blocked} />
          </dd>
        </div>
        <div className="flex flex-col-reverse pb-0.5">
          <dt className="eyebrow mt-1.5">Allowed</dt>
          <dd className="technical tabular text-lg leading-none text-parchment">
            <AnimatedNumber value={trackers.length - blocked} />
          </dd>
        </div>
      </dl>

      <ul className="mt-5 space-y-3">
        {groups.map(([category, value], index) => {
          const color = CATEGORY_COLOR[category];
          return (
            <li key={category}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 font-body text-xs font-medium text-parchment">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  {CATEGORY_LABEL[category]}
                </span>
                <span className="technical tabular shrink-0 text-xs text-ash">
                  {value.count} {value.count === 1 ? 'domain' : 'domains'} · {value.requests} requests
                </span>
              </div>
              <Meter
                value={(value.requests / maxRequests) * 100}
                from={`${color}99`}
                to={color}
                delay={0.15 + index * 0.08}
                className="mt-2 h-1.5"
              />
            </li>
          );
        })}
      </ul>

      <ul className="-mx-2 mt-5 space-y-0.5 border-t border-white/[0.06] pt-3">
        {trackers.map((tracker, index) => {
          const isBlocked = tracker.action === 'block';
          return (
            <motion.li
              key={tracker.domain}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + Math.min(index, 12) * 0.03, ease: EASE_OUT }}
            >
              <button
                type="button"
                onClick={() => onSelectDomain(tracker.domain)}
                className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-white/[0.04]"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOR[tracker.category] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="technical truncate text-xs text-parchment transition-colors duration-150 group-hover:text-white">
                      {tracker.domain}
                    </span>
                    <span
                      className={`chip ${
                        isBlocked
                          ? 'border-amber/30 bg-amber/10 text-amber'
                          : 'border-verdigris-bright/20 bg-verdigris-bright/[0.07] text-verdigris-bright'
                      }`}
                    >
                      {isBlocked ? 'Blocked' : 'Allowed'}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-ash-dim">
                    {CATEGORY_LABEL[tracker.category]} · {tracker.operator} · {tracker.requests}{' '}
                    {tracker.requests === 1 ? 'request' : 'requests'}
                  </span>
                </span>
                <ArrowRightIcon className="h-3 w-3 shrink-0 text-ash-dim opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

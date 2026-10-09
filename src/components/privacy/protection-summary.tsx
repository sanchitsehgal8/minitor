'use client';

import { motion } from 'framer-motion';

import { CATEGORY_COLOR, CardHeader, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { ShieldIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { RequestRecord, ScanTotals } from '@/lib/scan/types';

/**
 * "What MiniTor blocked" (spec §10).
 *
 * The provenance line is not optional: on a third-party site these decisions
 * are what MiniTor's rules *would* do, derived from the blocklist, because a
 * web page cannot intercept another origin's traffic. Saying so here is the
 * difference between a demo and a false claim.
 */
export function ProtectionSummary({
  totals,
  requests,
  isSimulated,
}: {
  readonly totals: ScanTotals;
  readonly requests: readonly RequestRecord[];
  readonly isSimulated: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const blocked = requests.filter((request) => request.action === 'block');
  const byCategory = {
    analytics: blocked.filter((request) => request.category === 'analytics').length,
    advertising: blocked.filter((request) => request.category === 'advertising').length,
    social: blocked.filter((request) => request.category === 'social').length,
    fingerprinting: blocked.filter((request) => request.category === 'fingerprinting').length,
  };

  if (totals.blockedRequests === 0) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-verdigris-bright/20 bg-verdigris-bright/[0.05] p-4">
        <CardHeader
          tone="good"
          icon={<ShieldIcon className="h-3.5 w-3.5" />}
          title="Nothing to block"
          description={
            <span className="text-ash-light">
              No request in this scan matched MiniTor’s privacy rules, so nothing was blocked.
            </span>
          }
        />
      </section>
    );
  }

  const rows: readonly { key: keyof typeof byCategory; label: string; value: number }[] = [
    { key: 'analytics', label: 'Analytics requests', value: byCategory.analytics },
    { key: 'advertising', label: 'Advertising requests', value: byCategory.advertising },
    { key: 'social', label: 'Social tracking requests', value: byCategory.social },
    { key: 'fingerprinting', label: 'Fingerprinting requests', value: byCategory.fingerprinting },
  ];
  const present = rows.filter((row) => row.value > 0);
  const categorised = Math.max(1, present.reduce((sum, row) => sum + row.value, 0));

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-amber/20 p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(216,162,74,0.09) 0%, rgba(18,22,29,0.85) 55%)',
        boxShadow: 'inset 0 1px 0 rgba(245,196,107,0.1)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-amber/20 blur-3xl"
      />

      <div className="relative">
        <CardHeader tone="caution" icon={<ShieldIcon className="h-3.5 w-3.5" />} title="MiniTor protection" />

        <p className="mt-4 font-display text-5xl leading-none text-amber-glow" style={{ textShadow: '0 0 32px rgba(245,196,107,0.35)' }}>
          <AnimatedNumber value={totals.blockedRequests} />
        </p>
        <p className="mt-1.5 text-xs text-ash-light">
          {totals.blockedRequests === 1 ? 'request blocked' : 'requests blocked'} across{' '}
          {totals.trackersBlocked} {totals.trackersBlocked === 1 ? 'domain' : 'domains'}
        </p>

        {/* Blocked requests by category: one stacked bar, 2px gaps between segments. */}
        <div aria-hidden="true" className="mt-4 flex h-2.5 w-full gap-0.5">
          {present.map((row, index) => (
            <motion.div
              key={row.key}
              className="h-full rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR[row.key] }}
              initial={prefersReducedMotion ? false : { width: '0%', opacity: 0 }}
              animate={{ width: `${(row.value / categorised) * 100}%`, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.15 + index * 0.1, ease: EASE_OUT }}
            />
          ))}
        </div>

        <ul className="mt-3 space-y-1.5">
          {present.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs text-ash-light">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLOR[row.key] }}
                />
                {row.label}
              </span>
              <span className="technical tabular shrink-0 text-xs text-parchment">{row.value}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-amber/15 pt-3 text-xs leading-relaxed text-ash-light">
          {isSimulated
            ? 'These are the decisions MiniTor’s privacy rules produce for the domains observed in this scan. Because a web page cannot intercept another site’s network traffic, this report is generated from a site profile rather than measured live.'
            : 'MiniTor prevented these requests from reaching their destination based on your current privacy rules.'}
        </p>
      </div>
    </section>
  );
}

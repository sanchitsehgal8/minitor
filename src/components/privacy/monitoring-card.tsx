'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { CARD, CardHeader, EASE_UI } from '@/components/privacy/privacy-primitives';
import { ClockIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/**
 * Website monitoring (spec §15).
 *
 * The honest framing matters: there is no server-side scheduler in this demo.
 * Monitoring records the user's intent — a flag on the stored scan — and the
 * copy says a re-scan happens when they next open the site, rather than
 * implying a cron job that does not exist.
 */
export function MonitoringCard({
  domain,
  isMonitored,
  lastScannedAt,
  canMonitor,
  onToggle,
}: {
  readonly domain: string;
  readonly isMonitored: boolean;
  readonly lastScannedAt: string;
  /** False for an unsaved scan (private mode), which has nothing to flag. */
  readonly canMonitor: boolean;
  readonly onToggle: (next: boolean) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className={CARD}>
      <CardHeader
        icon={<ClockIcon className="h-3.5 w-3.5" />}
        tone={canMonitor && isMonitored ? 'good' : 'neutral'}
        title="Monitoring"
        aside={
          canMonitor ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMonitored ? 'on' : 'off'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_UI }}
                className={`chip ${
                  isMonitored
                    ? 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright'
                    : 'border-white/[0.08] bg-white/[0.03] text-ash'
                }`}
              >
                <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                  {isMonitored && !prefersReducedMotion ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris-bright opacity-60" />
                  ) : null}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isMonitored ? 'bg-verdigris-bright' : 'bg-ash-dim'}`}
                  />
                </span>
                {isMonitored ? 'Monitored' : 'Not monitored'}
              </motion.span>
            </AnimatePresence>
          ) : null
        }
      />

      {canMonitor ? (
        <>
          <p className="mt-3 text-xs leading-relaxed text-ash-light">
            {isMonitored
              ? `${domain} is on your monitored list.`
              : `Add ${domain} to your monitored list to track its score over time.`}
          </p>

          <dl className="surface-inset mt-3 divide-y divide-white/[0.05]">
            <div className="flex items-baseline justify-between gap-3 px-3 py-2">
              <dt className="text-xs text-ash">Last scan</dt>
              <dd className="technical tabular text-xs text-parchment">
                {new Date(lastScannedAt).toLocaleString('en-GB')}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 px-3 py-2">
              <dt className="text-xs text-ash">Next scan</dt>
              <dd className="technical text-right text-xs text-ash-light">
                {isMonitored ? 'When you next analyse this site' : 'Not scheduled'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => onToggle(!isMonitored)}
            className={`mt-3 w-full ${isMonitored ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isMonitored ? 'Stop monitoring this site' : 'Monitor this website'}
          </button>

          <p className="mt-3 text-xs leading-relaxed text-ash-dim">
            MiniTor has no background scanner. Monitoring marks a site as one you care about and
            keeps its scan history, so scores are compared the next time you analyse it.
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-ash">
          This scan was not saved, so it cannot be monitored. Private tabs do not store scans.
        </p>
      )}
    </section>
  );
}

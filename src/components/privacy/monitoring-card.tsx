'use client';

import { ClockIcon } from '@/components/ui/icons';

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
  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="flex items-center gap-2 font-body text-sm font-medium text-parchment">
        <ClockIcon className="h-4 w-4 text-ash-light" />
        Monitoring
      </h3>

      {canMonitor ? (
        <>
          <p className="mt-1.5 text-xs text-ash-light">
            {isMonitored
              ? `${domain} is on your monitored list.`
              : `Add ${domain} to your monitored list to track its score over time.`}
          </p>

          <dl className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-ash-dim">Last scan</dt>
              <dd className="technical text-xs text-parchment">
                {new Date(lastScannedAt).toLocaleString('en-GB')}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-ash-dim">Next scan</dt>
              <dd className="technical text-xs text-ash-light">
                {isMonitored ? 'When you next analyse this site' : 'Not scheduled'}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => onToggle(!isMonitored)}
            className={`mt-3 w-full rounded-md border px-3 py-2 font-body text-xs transition-colors duration-150 ${
              isMonitored
                ? 'border-ink-edge text-ash-light hover:border-ash-dim hover:text-parchment'
                : 'border-verdigris bg-verdigris-dim/20 text-verdigris hover:bg-verdigris-dim/30'
            }`}
          >
            {isMonitored ? 'Stop monitoring this site' : 'Monitor this website'}
          </button>

          <p className="mt-2.5 text-xs leading-relaxed text-ash-dim">
            MiniTor has no background scanner. Monitoring marks a site as one you care about and
            keeps its scan history, so scores are compared the next time you analyse it.
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-ash-dim">
          This scan was not saved, so it cannot be monitored. Private tabs do not store scans.
        </p>
      )}
    </section>
  );
}

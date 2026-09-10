'use client';

import { ShieldIcon } from '@/components/ui/icons';
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
  const blocked = requests.filter((request) => request.action === 'block');
  const byCategory = {
    analytics: blocked.filter((request) => request.category === 'analytics').length,
    advertising: blocked.filter((request) => request.category === 'advertising').length,
    social: blocked.filter((request) => request.category === 'social').length,
    fingerprinting: blocked.filter((request) => request.category === 'fingerprinting').length,
  };

  if (totals.blockedRequests === 0) {
    return (
      <section className="rounded-lg border border-verdigris-dim bg-verdigris-dim/10 p-4">
        <h3 className="flex items-center gap-2 font-body text-sm font-medium text-verdigris">
          <ShieldIcon className="h-4 w-4" />
          Nothing to block
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ash-light">
          No request in this scan matched MiniTor’s privacy rules, so nothing was blocked.
        </p>
      </section>
    );
  }

  const rows: readonly { label: string; value: number }[] = [
    { label: 'Analytics requests', value: byCategory.analytics },
    { label: 'Advertising requests', value: byCategory.advertising },
    { label: 'Social tracking requests', value: byCategory.social },
    { label: 'Fingerprinting requests', value: byCategory.fingerprinting },
  ];

  return (
    <section className="rounded-lg border border-amber-dim bg-amber-dim/12 p-4">
      <h3 className="flex items-center gap-2 font-body text-sm font-medium text-amber">
        <ShieldIcon className="h-4 w-4" />
        MiniTor protection
      </h3>

      <p className="technical mt-2 text-3xl text-parchment">{totals.blockedRequests}</p>
      <p className="text-xs text-ash-light">
        {totals.blockedRequests === 1 ? 'request blocked' : 'requests blocked'} across{' '}
        {totals.trackersBlocked} {totals.trackersBlocked === 1 ? 'domain' : 'domains'}
      </p>

      <ul className="mt-3 space-y-1 border-t border-amber-dim/40 pt-3">
        {rows
          .filter((row) => row.value > 0)
          .map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-ash-light">{row.label}</span>
              <span className="technical shrink-0 text-xs text-parchment">{row.value}</span>
            </li>
          ))}
      </ul>

      <p className="mt-3 border-t border-amber-dim/40 pt-3 text-xs leading-relaxed text-ash-light">
        {isSimulated
          ? 'These are the decisions MiniTor’s privacy rules produce for the domains observed in this scan. Because a web page cannot intercept another site’s network traffic, this report is generated from a site profile rather than measured live.'
          : 'MiniTor prevented these requests from reaching their destination based on your current privacy rules.'}
      </p>
    </section>
  );
}

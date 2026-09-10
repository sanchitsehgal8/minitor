'use client';

import { useMemo } from 'react';

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

  if (trackers.length === 0) {
    return (
      <section className="rounded-lg border border-verdigris-dim bg-verdigris-dim/10 p-4">
        <h3 className="font-body text-sm font-medium text-verdigris">No known trackers observed</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ash-light">
          No domains from MiniTor’s blocklist were contacted in this scan. That blocklist covers 32
          well-known domains, so this is not proof that a site does no tracking at all.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Trackers observed</h3>
      <p className="mt-1 text-xs text-ash">
        {trackers.length} {trackers.length === 1 ? 'domain' : 'domains'} matched MiniTor’s blocklist
        in this scan.
      </p>

      <ul className="mt-4 space-y-2.5">
        {groups.map(([category, value]) => (
          <li key={category}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-body text-xs text-parchment">{CATEGORY_LABEL[category]}</span>
              <span className="technical shrink-0 text-xs text-ash">
                {value.count} {value.count === 1 ? 'domain' : 'domains'} · {value.requests} requests
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-sunken">
              <div
                className="h-full rounded-full bg-amber"
                style={{ width: `${(value.requests / maxRequests) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <ul className="mt-4 space-y-1 border-t border-ink-edge pt-3">
        {trackers.map((tracker) => (
          <li key={tracker.domain}>
            <button
              type="button"
              onClick={() => onSelectDomain(tracker.domain)}
              className="w-full rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-ink"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="technical truncate text-xs text-parchment">{tracker.domain}</span>
                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xs ${
                    tracker.action === 'block'
                      ? 'bg-amber-dim/20 text-amber'
                      : 'bg-verdigris-dim/20 text-verdigris'
                  }`}
                >
                  {tracker.action === 'block' ? 'Blocked' : 'Allowed'}
                </span>
              </div>
              <span className="block font-mono text-xs text-ash-dim">
                {CATEGORY_LABEL[tracker.category]} · {tracker.operator} · {tracker.requests}{' '}
                {tracker.requests === 1 ? 'request' : 'requests'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

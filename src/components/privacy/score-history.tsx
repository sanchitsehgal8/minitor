'use client';

import { newTrackerDomains, privacyScoreDelta } from '@/lib/scan/comparison';
import type { StoredScan } from '@/lib/client/api-client';

/**
 * Privacy score across repeated scans of one site (spec §14).
 *
 * A sparkline drawn from the scan list, oldest to newest, plus the delta
 * sentence and any tracker domains that were not present before.
 */
export function ScoreHistory({ scans }: { readonly scans: readonly StoredScan[] }) {
  // `scans` arrives newest-first from the API; chart oldest-first.
  const ordered = [...scans].reverse();

  if (ordered.length < 2) {
    return (
      <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
        <h3 className="font-body text-sm font-medium text-parchment">Score history</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ash">
          Only one scan of this site so far. Analyse it again later to see whether its privacy score
          changes.
        </p>
      </section>
    );
  }

  const previous = ordered[ordered.length - 2]!;
  const current = ordered[ordered.length - 1]!;
  const delta = privacyScoreDelta(previous, current);
  const added = newTrackerDomains(previous, current);

  const width = 300;
  const height = 88;
  const padding = 8;
  const scores = ordered.map((scan) => scan.privacy.total);
  const min = Math.max(0, Math.min(...scores) - 8);
  const max = Math.min(100, Math.max(...scores) + 8);
  const span = Math.max(1, max - min);

  const points = ordered.map((scan, index) => ({
    x: padding + (index / Math.max(1, ordered.length - 1)) * (width - padding * 2),
    y: height - padding - ((scan.privacy.total - min) / span) * (height - padding * 2),
    scan,
  }));

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Score history</h3>
      <p className="mt-1 text-xs text-ash">
        {ordered.length} scans of {current.domain}
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Privacy score across ${ordered.length} scans, currently ${current.privacy.total}`}
      >
        <path d={path} fill="none" stroke="#3E8E7E" strokeWidth="1.6" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={point.scan.id} cx={point.x} cy={point.y} r="3" fill="#3E8E7E" />
        ))}
      </svg>

      <p
        className={`mt-2 text-xs ${
          delta.direction === 'down' ? 'text-amber' : delta.direction === 'up' ? 'text-verdigris' : 'text-ash-light'
        }`}
      >
        {delta.sentence}
      </p>

      {added.length > 0 ? (
        <div className="mt-3 border-t border-ink-edge pt-3">
          <p className="text-xs text-ash-dim">
            Newly observed tracker {added.length === 1 ? 'domain' : 'domains'}
          </p>
          <ul className="mt-1 space-y-0.5">
            {added.map((domain) => (
              <li key={domain} className="technical text-xs text-amber">
                {domain}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

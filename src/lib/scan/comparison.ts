/**
 * Side-by-side comparison of two scans (spec §12).
 *
 * The summary sentence is generated from whichever metrics actually differ, and
 * deliberately never declares one site better overall — a site can have fewer
 * trackers and worse cookie hygiene at the same time. It reports the largest
 * observed difference and attributes it to the scan, not to the site's nature.
 */

import type { ScanResult } from '@/lib/scan/types';

export type ComparisonRow = {
  readonly id: string;
  readonly label: string;
  readonly left: number;
  readonly right: number;
  /** Formatting hint: 'score' is /100, 'percent' is %, 'count' is a bare number. */
  readonly unit: 'score' | 'percent' | 'count';
  /** Whether a higher number is the more private outcome. */
  readonly higherIsBetter: boolean;
};

export type Comparison = {
  readonly left: ScanResult;
  readonly right: ScanResult;
  readonly rows: readonly ComparisonRow[];
  readonly summary: string;
};

export function compareScans(left: ScanResult, right: ScanResult): Comparison {
  const rows: readonly ComparisonRow[] = [
    {
      id: 'privacy',
      label: 'Privacy score',
      left: left.privacy.total,
      right: right.privacy.total,
      unit: 'score',
      higherIsBetter: true,
    },
    {
      id: 'security',
      label: 'Security observations score',
      left: left.security.total,
      right: right.security.total,
      unit: 'score',
      higherIsBetter: true,
    },
    {
      id: 'trackers',
      label: 'Tracker domains',
      left: left.totals.trackersDetected,
      right: right.totals.trackersDetected,
      unit: 'count',
      higherIsBetter: false,
    },
    {
      id: 'ads',
      label: 'Advertising domains',
      left: left.totals.advertisingDomains,
      right: right.totals.advertisingDomains,
      unit: 'count',
      higherIsBetter: false,
    },
    {
      id: 'thirdParty',
      label: 'Third-party domains',
      left: left.totals.thirdPartyDomains,
      right: right.totals.thirdPartyDomains,
      unit: 'count',
      higherIsBetter: false,
    },
    {
      id: 'https',
      label: 'Requests over HTTPS',
      left: left.totals.httpsShare,
      right: right.totals.httpsShare,
      unit: 'percent',
      higherIsBetter: true,
    },
  ];

  return { left, right, rows, summary: summarise(left, right) };
}

/** Picks the single most notable difference and states it, scoped to the scan. */
function summarise(left: ScanResult, right: ScanResult): string {
  const trackerGap = left.totals.trackersDetected - right.totals.trackersDetected;
  const thirdPartyGap = left.totals.thirdPartyDomains - right.totals.thirdPartyDomains;
  const privacyGap = left.privacy.total - right.privacy.total;

  if (Math.abs(trackerGap) >= 3) {
    const [fewer, more] = trackerGap > 0 ? [right, left] : [left, right];
    return `${fewer.domain} contacted ${Math.abs(trackerGap)} fewer tracker domains than ${more.domain} in these scans.`;
  }

  if (Math.abs(thirdPartyGap) >= 5) {
    const [fewer, more] = thirdPartyGap > 0 ? [right, left] : [left, right];
    return `${fewer.domain} showed lower third-party activity than ${more.domain} in these scans.`;
  }

  if (Math.abs(privacyGap) >= 5) {
    const [higher, lower] = privacyGap > 0 ? [left, right] : [right, left];
    return `${higher.domain} scored ${Math.abs(privacyGap)} points higher than ${lower.domain} on privacy in these scans, though the individual categories differ.`;
  }

  return `${left.domain} and ${right.domain} scored similarly in these scans.`;
}

/** Change between two scans of one site, for score history (spec §14). */
export type ScoreDelta = {
  readonly points: number;
  readonly direction: 'up' | 'down' | 'flat';
  readonly sentence: string;
};

export function privacyScoreDelta(previous: ScanResult, current: ScanResult): ScoreDelta {
  const points = current.privacy.total - previous.privacy.total;

  if (points === 0) {
    return { points: 0, direction: 'flat', sentence: 'Privacy score is unchanged since the previous scan.' };
  }

  const direction = points > 0 ? 'up' : 'down';
  const verb = direction === 'up' ? 'increased' : 'decreased';

  return {
    points,
    direction,
    sentence: `Privacy score ${verb} by ${Math.abs(points)} ${Math.abs(points) === 1 ? 'point' : 'points'} since the previous scan.`,
  };
}

/** Tracker domains present in `current` that were absent from `previous`. */
export function newTrackerDomains(previous: ScanResult, current: ScanResult): readonly string[] {
  const before = new Set(previous.trackers.map((tracker) => tracker.domain));
  return current.trackers.map((tracker) => tracker.domain).filter((domain) => !before.has(domain));
}

/**
 * Explainable privacy score (spec §4).
 *
 * Four weighted categories, each a pure function of observed counts, each
 * carrying the sentence that explains its own number. Nothing here is
 * arbitrary: given the same totals you get the same score, and the report can
 * always answer "why".
 *
 * A service, not a component — the UI renders `PrivacyScore`, it never computes
 * one.
 */

import type { PrivacyScore, ScanTotals, ScoreCategory, TrackerFinding } from '@/lib/scan/types';
import type { CookieFinding } from '@/lib/scan/types';
import type { ParameterFinding } from '@/lib/scan/tracking-parameters';

/**
 * Weights sum to 1. Tracker exposure dominates because it is the clearest
 * signal; tracking parameters weigh least, since they leak an identifier but
 * do not by themselves open a connection to a third party.
 */
const WEIGHTS = {
  trackerExposure: 0.36,
  thirdPartyActivity: 0.22,
  advertising: 0.18,
  cookiePrivacy: 0.14,
  trackingParameters: 0.1,
} as const;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Plural-aware noun, so explanations do not read like machine output. */
function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Tracker exposure. Penalises each distinct tracker domain, then gives back
 * credit for the share MiniTor blocked — a tracker that never reached the
 * network is a materially better outcome than one that did.
 */
function scoreTrackerExposure(trackers: readonly TrackerFinding[]): ScoreCategory {
  const total = trackers.length;
  const blocked = trackers.filter((tracker) => tracker.action === 'block').length;

  if (total === 0) {
    return {
      id: 'trackerExposure',
      label: 'Tracker exposure',
      score: 100,
      weight: WEIGHTS.trackerExposure,
      explanation: 'No domains from MiniTor’s blocklist were contacted in this scan.',
    };
  }

  // 6 points per tracker domain, capped at 70 so a very heavy site still
  // differs from a catastrophic one; blocking returns up to 45 of that.
  const penalty = Math.min(70, total * 6);
  const blockedShare = blocked / total;
  const recovered = penalty * blockedShare * 0.65;

  return {
    id: 'trackerExposure',
    label: 'Tracker exposure',
    score: clamp(100 - penalty + recovered),
    weight: WEIGHTS.trackerExposure,
    explanation:
      `${count(total, 'tracker domain')} observed, of which ${blocked} ` +
      `${blocked === 1 ? 'was' : 'were'} blocked by MiniTor’s privacy rules. ` +
      'The score reflects both how many were present and how many were stopped.',
  };
}

/**
 * Third-party activity, scored on the share of requests going off-origin
 * rather than the raw count — a large site is not automatically worse.
 */
function scoreThirdPartyActivity(totals: ScanTotals, thirdPartyRequests: number): ScoreCategory {
  if (totals.totalRequests === 0) {
    return {
      id: 'thirdPartyActivity',
      label: 'Third-party activity',
      score: 100,
      weight: WEIGHTS.thirdPartyActivity,
      explanation: 'No requests were observed in this scan.',
    };
  }

  const share = thirdPartyRequests / totals.totalRequests;
  const percent = Math.round(share * 100);

  return {
    id: 'thirdPartyActivity',
    label: 'Third-party activity',
    // Full marks below 10% off-origin, zero by 70%.
    score: clamp(share <= 0.1 ? 100 : 100 - ((share - 0.1) / 0.6) * 100),
    weight: WEIGHTS.thirdPartyActivity,
    explanation:
      `${percent}% of observed requests went to ${count(totals.thirdPartyDomains, 'other domain')}. ` +
      'Each additional origin is another party receiving your IP address and page context.',
  };
}

/** Advertising activity, weighted by distinct ad domains contacted. */
function scoreAdvertising(totals: ScanTotals): ScoreCategory {
  const { advertisingDomains } = totals;

  if (advertisingDomains === 0) {
    return {
      id: 'advertising',
      label: 'Advertising',
      score: 100,
      weight: WEIGHTS.advertising,
      explanation: 'No known advertising domains were contacted in this scan.',
    };
  }

  return {
    id: 'advertising',
    label: 'Advertising',
    score: clamp(100 - advertisingDomains * 9),
    weight: WEIGHTS.advertising,
    explanation:
      `${count(advertisingDomains, 'advertising domain')} observed. ` +
      'Ad and remarketing endpoints commonly correlate activity across sites.',
  };
}

/**
 * Cookie privacy. Third-party tracking cookies are the heaviest penalty, since
 * they are the mechanism for cross-site correlation; missing Secure/HttpOnly
 * flags count for less but still count.
 */
function scoreCookiePrivacy(cookies: readonly CookieFinding[]): ScoreCategory {
  if (cookies.length === 0) {
    return {
      id: 'cookiePrivacy',
      label: 'Cookie privacy',
      score: 100,
      weight: WEIGHTS.cookiePrivacy,
      explanation: 'No cookies were observed in this scan.',
    };
  }

  const trackingCookies = cookies.filter(
    (cookie) => !cookie.firstParty && (cookie.type === 'analytics' || cookie.type === 'advertising'),
  );
  const insecure = cookies.filter((cookie) => !cookie.secure || !cookie.httpOnly);

  const penalty = trackingCookies.length * 14 + insecure.length * 4;

  return {
    id: 'cookiePrivacy',
    label: 'Cookie privacy',
    score: clamp(100 - penalty),
    weight: WEIGHTS.cookiePrivacy,
    explanation:
      `${count(cookies.length, 'cookie')} observed. ` +
      `${trackingCookies.length} third-party tracking ` +
      `${trackingCookies.length === 1 ? 'cookie' : 'cookies'}, and ${insecure.length} ` +
      `missing Secure or HttpOnly.`,
  };
}

/**
 * Tracking parameters in observed URLs. Distinct occurrences are what matter:
 * one `utm_source` on many URLs is a single tagging scheme, whereas several
 * different click identifiers means several parties can correlate the visit.
 */
function scoreTrackingParameters(parameters: readonly ParameterFinding[]): ScoreCategory {
  if (parameters.length === 0) {
    return {
      id: 'trackingParameters',
      label: 'Tracking parameters',
      score: 100,
      weight: WEIGHTS.trackingParameters,
      explanation:
        'No known campaign or click-identifier parameters were found in the URLs observed in this scan.',
    };
  }

  const clickIds = parameters.filter((parameter) => parameter.category === 'click-id').length;
  // Click identifiers are per-user; campaign tags are usually per-campaign, so
  // they are penalised more heavily.
  const penalty = parameters.length * 7 + clickIds * 8;

  return {
    id: 'trackingParameters',
    label: 'Tracking parameters',
    score: clamp(100 - penalty),
    weight: WEIGHTS.trackingParameters,
    explanation:
      `${count(parameters.length, 'tracking parameter')} found in the observed URLs` +
      (clickIds > 0
        ? `, including ${count(clickIds, 'click identifier')} that can tie this visit to an individual click.`
        : ', all campaign or email tags rather than per-click identifiers.'),
  };
}

/**
 * Combines the categories into the overall score. The total is the weighted
 * mean of the parts, so the breakdown always adds up to what is displayed —
 * there is no separate headline number to disagree with it.
 */
export function calculatePrivacyScore(input: {
  readonly totals: ScanTotals;
  readonly trackers: readonly TrackerFinding[];
  readonly cookies: readonly CookieFinding[];
  readonly thirdPartyRequests: number;
  readonly parameters?: readonly ParameterFinding[];
}): PrivacyScore {
  const categories: readonly ScoreCategory[] = [
    scoreTrackerExposure(input.trackers),
    scoreThirdPartyActivity(input.totals, input.thirdPartyRequests),
    scoreAdvertising(input.totals),
    scoreCookiePrivacy(input.cookies),
    scoreTrackingParameters(input.parameters ?? []),
  ];

  const total = categories.reduce((sum, category) => sum + category.score * category.weight, 0);

  return { total: clamp(total), categories };
}

/** Verbal band for a score. Used for colour and wording, never as a verdict. */
export function scoreBand(score: number): 'strong' | 'mixed' | 'poor' {
  if (score >= 80) return 'strong';
  if (score >= 55) return 'mixed';
  return 'poor';
}

import { describe, expect, it } from 'vitest';

import { calculatePrivacyScore, scoreBand } from '@/lib/scan/privacy-score';
import type { CookieFinding, ScanTotals, TrackerFinding } from '@/lib/scan/types';

const cleanTotals: ScanTotals = {
  totalRequests: 20,
  blockedRequests: 0,
  allowedRequests: 20,
  trackersDetected: 0,
  trackersBlocked: 0,
  advertisingDomains: 0,
  thirdPartyDomains: 0,
  cookieCount: 0,
  httpsShare: 100,
};

function tracker(domain: string, action: 'allow' | 'block'): TrackerFinding {
  return { domain, operator: 'Test', category: 'analytics', requests: 2, action };
}

describe('calculatePrivacyScore', () => {
  it('gives a clean site full marks', () => {
    const score = calculatePrivacyScore({
      totals: cleanTotals,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    expect(score.total).toBe(100);
  });

  it('is the weighted mean of its categories, so the breakdown always adds up', () => {
    const score = calculatePrivacyScore({
      totals: { ...cleanTotals, trackersDetected: 4, advertisingDomains: 2, thirdPartyDomains: 6 },
      trackers: [tracker('a.com', 'block'), tracker('b.com', 'allow')],
      cookies: [],
      thirdPartyRequests: 8,
    });

    const weighted = score.categories.reduce((sum, c) => sum + c.score * c.weight, 0);
    expect(score.total).toBe(Math.round(weighted));
  });

  it('weights sum to exactly 1', () => {
    const score = calculatePrivacyScore({
      totals: cleanTotals,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    const sum = score.categories.reduce((total, category) => total + category.weight, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('scores a site better when its trackers were blocked than when they were not', () => {
    const totals = { ...cleanTotals, trackersDetected: 5, thirdPartyDomains: 5 };
    const domains = ['a.com', 'b.com', 'c.com', 'd.com', 'e.com'];

    const blocked = calculatePrivacyScore({
      totals,
      trackers: domains.map((d) => tracker(d, 'block')),
      cookies: [],
      thirdPartyRequests: 10,
    });
    const allowed = calculatePrivacyScore({
      totals,
      trackers: domains.map((d) => tracker(d, 'allow')),
      cookies: [],
      thirdPartyRequests: 10,
    });

    expect(blocked.total).toBeGreaterThan(allowed.total);
  });

  it('penalises more tracker domains monotonically', () => {
    const build = (n: number) =>
      calculatePrivacyScore({
        totals: { ...cleanTotals, trackersDetected: n, thirdPartyDomains: n },
        trackers: Array.from({ length: n }, (_, i) => tracker(`t${i}.com`, 'allow')),
        cookies: [],
        thirdPartyRequests: n * 2,
      }).total;

    expect(build(0)).toBeGreaterThan(build(3));
    expect(build(3)).toBeGreaterThan(build(10));
  });

  it('penalises third-party tracking cookies more than a missing flag alone', () => {
    const base = { totals: cleanTotals, trackers: [], thirdPartyRequests: 0 };

    const trackingCookie: CookieFinding = {
      name: '_ga', domain: 'google-analytics.com', type: 'analytics',
      firstParty: false, secure: false, httpOnly: false, warnings: [],
    };
    const sloppyFirstParty: CookieFinding = {
      name: 'prefs', domain: 'example.com', type: 'functional',
      firstParty: true, secure: false, httpOnly: false, warnings: [],
    };

    const withTracking = calculatePrivacyScore({ ...base, cookies: [trackingCookie] }).total;
    const withSloppy = calculatePrivacyScore({ ...base, cookies: [sloppyFirstParty] }).total;

    expect(withTracking).toBeLessThan(withSloppy);
  });

  it('never leaves the 0-100 range even for a pathological site', () => {
    const score = calculatePrivacyScore({
      totals: { ...cleanTotals, totalRequests: 100, trackersDetected: 60, advertisingDomains: 40, thirdPartyDomains: 90 },
      trackers: Array.from({ length: 60 }, (_, i) => tracker(`t${i}.com`, 'allow')),
      cookies: Array.from({ length: 30 }, (_, i) => ({
        name: `c${i}`, domain: 'tracker.com', type: 'advertising' as const,
        firstParty: false, secure: false, httpOnly: false, warnings: [],
      })),
      thirdPartyRequests: 95,
    });
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    score.categories.forEach((c) => {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    });
  });

  it('gives every category a non-empty explanation', () => {
    const score = calculatePrivacyScore({
      totals: { ...cleanTotals, trackersDetected: 2, advertisingDomains: 1, thirdPartyDomains: 3 },
      trackers: [tracker('a.com', 'block')],
      cookies: [{ name: '_ga', domain: 'g.com', type: 'analytics', firstParty: false, secure: false, httpOnly: false, warnings: [] }],
      thirdPartyRequests: 5,
    });
    score.categories.forEach((c) => expect(c.explanation.length).toBeGreaterThan(20));
  });
});

describe('scoreBand', () => {
  it('bands scores at the documented thresholds', () => {
    expect(scoreBand(100)).toBe('strong');
    expect(scoreBand(80)).toBe('strong');
    expect(scoreBand(79)).toBe('mixed');
    expect(scoreBand(55)).toBe('mixed');
    expect(scoreBand(54)).toBe('poor');
  });
});

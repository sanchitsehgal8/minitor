/**
 * The privacy score's public contract.
 *
 * These pin the properties the UI and the README both assert. The "five
 * weighted factors" claim in particular had already drifted: the code computed
 * five while three user-facing strings still said four, and nothing caught it.
 */

import { describe, expect, it } from 'vitest';

import { calculatePrivacyScore, scoreBand } from '@/lib/scan/privacy-score';
import { buildScanResult } from '@/lib/scan/scan-engine';
import type { ScanTotals } from '@/lib/scan/types';

const EMPTY_TOTALS: ScanTotals = {
  totalRequests: 0,
  blockedRequests: 0,
  allowedRequests: 0,
  trackersDetected: 0,
  trackersBlocked: 0,
  advertisingDomains: 0,
  thirdPartyDomains: 0,
  cookieCount: 0,
  httpsShare: 100,
};

describe('privacy score contract', () => {
  it('reports exactly five weighted factors', () => {
    const score = calculatePrivacyScore({
      totals: EMPTY_TOTALS,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    expect(score.categories).toHaveLength(5);
  });

  it('has weights that sum to exactly 1', () => {
    const { categories } = calculatePrivacyScore({
      totals: EMPTY_TOTALS,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    const sum = categories.reduce((total, category) => total + category.weight, 0);
    // Exact, not approximate: these are chosen so the float sum is precisely 1.
    expect(sum).toBe(1);
  });

  it('gives every factor a label and an explanation the UI can show', () => {
    const scan = buildScanResult({ url: 'cnn.com' });
    for (const category of scan.privacy.categories) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.explanation.length).toBeGreaterThan(0);
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(category.score).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the total within 0-100 for both extremes', () => {
    const clean = calculatePrivacyScore({
      totals: EMPTY_TOTALS,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    expect(clean.total).toBeGreaterThanOrEqual(0);
    expect(clean.total).toBeLessThanOrEqual(100);

    const heavy = buildScanResult({ url: 'cnn.com' }).privacy;
    expect(heavy.total).toBeGreaterThanOrEqual(0);
    expect(heavy.total).toBeLessThanOrEqual(100);
  });

  it('never produces NaN, even with zero requests', () => {
    const score = calculatePrivacyScore({
      totals: EMPTY_TOTALS,
      trackers: [],
      cookies: [],
      thirdPartyRequests: 0,
    });
    expect(Number.isNaN(score.total)).toBe(false);
    score.categories.forEach((category) => expect(Number.isNaN(category.score)).toBe(false));
  });

  it('bands scores at the documented thresholds', () => {
    expect(scoreBand(100)).toBe('strong');
    expect(scoreBand(80)).toBe('strong');
    expect(scoreBand(79)).toBe('mixed');
    expect(scoreBand(55)).toBe('mixed');
    expect(scoreBand(54)).toBe('poor');
    expect(scoreBand(0)).toBe('poor');
  });

  it('scores a tracker-heavy site below a privacy-first one', () => {
    // The ordering is the product claim; the exact numbers are free to change.
    const wikipedia = buildScanResult({ url: 'wikipedia.org' }).privacy.total;
    const news = buildScanResult({ url: 'cnn.com' }).privacy.total;
    expect(wikipedia).toBeGreaterThan(news);
  });
});

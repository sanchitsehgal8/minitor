import { describe, expect, it } from 'vitest';

import { compareScans, newTrackerDomains, privacyScoreDelta } from '@/lib/scan/comparison';
import { buildScanResult } from '@/lib/scan/scan-engine';
import { calculateSecurityScore, countWarnings, sortFindings } from '@/lib/scan/security-score';
import type { SecurityFinding } from '@/lib/scan/types';

describe('compareScans', () => {
  const clean = buildScanResult({ url: 'https://en.wikipedia.org' });
  const heavy = buildScanResult({ url: 'https://www.nytimes.com' });

  it('reports each metric for both sides', () => {
    const comparison = compareScans(clean, heavy);
    expect(comparison.rows).toHaveLength(6);
    comparison.rows.forEach((row) => {
      expect(Number.isFinite(row.left)).toBe(true);
      expect(Number.isFinite(row.right)).toBe(true);
    });
  });

  it('marks tracker and ad counts as lower-is-better', () => {
    const comparison = compareScans(clean, heavy);
    const trackers = comparison.rows.find((row) => row.id === 'trackers');
    const privacy = comparison.rows.find((row) => row.id === 'privacy');
    expect(trackers?.higherIsBetter).toBe(false);
    expect(privacy?.higherIsBetter).toBe(true);
  });

  it('scopes its summary to the scans and never calls a site better overall', () => {
    const summary = compareScans(clean, heavy).summary;
    expect(summary).toMatch(/scans/);
    expect(summary.toLowerCase()).not.toMatch(/\bbetter\b|\bsafer\b|\bworse\b/);
  });

  it('names the site with fewer trackers when the gap is large', () => {
    const summary = compareScans(heavy, clean).summary;
    expect(summary).toContain(clean.domain);
    expect(summary).toContain('fewer tracker domains');
  });

  it('says results are similar when comparing a site with itself', () => {
    expect(compareScans(clean, clean).summary).toMatch(/similarly/);
  });
});

describe('privacyScoreDelta', () => {
  const base = buildScanResult({ url: 'https://example.com' });

  it('reports a decrease with the right magnitude and wording', () => {
    const previous = { ...base, privacy: { ...base.privacy, total: 90 } };
    const current = { ...base, privacy: { ...base.privacy, total: 79 } };

    const delta = privacyScoreDelta(previous, current);
    expect(delta.points).toBe(-11);
    expect(delta.direction).toBe('down');
    expect(delta.sentence).toBe('Privacy score decreased by 11 points since the previous scan.');
  });

  it('reports an increase', () => {
    const delta = privacyScoreDelta(
      { ...base, privacy: { ...base.privacy, total: 60 } },
      { ...base, privacy: { ...base.privacy, total: 61 } },
    );
    expect(delta.direction).toBe('up');
    expect(delta.sentence).toContain('increased by 1 point');
  });

  it('reports no change', () => {
    const delta = privacyScoreDelta(base, base);
    expect(delta.direction).toBe('flat');
    expect(delta.points).toBe(0);
  });
});

describe('newTrackerDomains', () => {
  const base = buildScanResult({ url: 'https://example.com' });

  it('lists only trackers absent from the previous scan', () => {
    const previous = {
      ...base,
      trackers: [{ domain: 'a.com', operator: 'A', category: 'analytics' as const, requests: 1, action: 'block' as const }],
    };
    const current = {
      ...base,
      trackers: [
        { domain: 'a.com', operator: 'A', category: 'analytics' as const, requests: 1, action: 'block' as const },
        { domain: 'b.com', operator: 'B', category: 'advertising' as const, requests: 2, action: 'block' as const },
      ],
    };
    expect(newTrackerDomains(previous, current)).toEqual(['b.com']);
  });

  it('returns nothing when no trackers were added', () => {
    expect(newTrackerDomains(base, base)).toEqual([]);
  });
});

describe('calculateSecurityScore', () => {
  const pass = (id: string): SecurityFinding => ({
    id, title: `${id} ok`, status: 'pass', severity: 'low', description: 'Observed.',
  });
  const warn = (id: string, severity: 'low' | 'medium' | 'high'): SecurityFinding => ({
    id, title: `${id} missing`, status: 'warn', severity, description: 'Not observed.',
  });

  it('gives 100 when every check passes', () => {
    expect(calculateSecurityScore([pass('https'), pass('hsts')]).total).toBe(100);
  });

  it('deducts more for higher severity', () => {
    const low = calculateSecurityScore([warn('a', 'low')]).total;
    const medium = calculateSecurityScore([warn('a', 'medium')]).total;
    const high = calculateSecurityScore([warn('a', 'high')]).total;
    expect(low).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(high);
  });

  it('ignores passing findings when deducting', () => {
    const withPasses = calculateSecurityScore([warn('a', 'medium'), pass('b'), pass('c')]).total;
    expect(withPasses).toBe(calculateSecurityScore([warn('a', 'medium')]).total);
  });

  it('floors at zero rather than going negative', () => {
    const many = Array.from({ length: 12 }, (_, i) => warn(`w${i}`, 'high'));
    expect(calculateSecurityScore(many).total).toBe(0);
  });

  it('counts warnings only', () => {
    expect(countWarnings([warn('a', 'high'), pass('b'), warn('c', 'low')])).toBe(2);
  });

  it('sorts warnings before passes, most severe first', () => {
    const sorted = sortFindings([pass('ok'), warn('low', 'low'), warn('high', 'high'), warn('med', 'medium')]);
    expect(sorted.map((f) => f.id)).toEqual(['high', 'med', 'low', 'ok']);
  });
});

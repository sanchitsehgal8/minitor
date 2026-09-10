import { describe, expect, it } from 'vitest';

import {
  findTrackingParameters,
  matchParameter,
  parameterCount,
  stripTrackingParameters,
} from '@/lib/scan/tracking-parameters';
import { calculatePrivacyScore } from '@/lib/scan/privacy-score';
import { applySiteOverride, buildScanResult } from '@/lib/scan/scan-engine';
import type { ScanTotals } from '@/lib/scan/types';

describe('matchParameter', () => {
  it('matches known keys case-insensitively', () => {
    expect(matchParameter('utm_source')?.category).toBe('campaign');
    expect(matchParameter('GCLID')?.category).toBe('click-id');
    expect(matchParameter('  fbclid ')?.operator).toBe('Meta');
  });

  it('does not match ordinary query keys', () => {
    for (const key of ['q', 'page', 'id', 'source', 'utm', 'clid']) {
      expect(matchParameter(key)).toBeNull();
    }
  });
});

describe('findTrackingParameters', () => {
  it('finds parameters across several URLs and counts occurrences', () => {
    const found = findTrackingParameters([
      'https://a.test/?utm_source=email&utm_campaign=spring',
      'https://a.test/page?utm_source=email',
      'https://a.test/other?gclid=abc123',
    ]);

    const bySource = found.find((f) => f.key === 'utm_source');
    expect(bySource?.occurrences).toBe(2);
    expect(found.find((f) => f.key === 'gclid')?.occurrences).toBe(1);
    expect(found.find((f) => f.key === 'utm_campaign')?.occurrences).toBe(1);
  });

  it('counts a repeated key within one URL only once', () => {
    const found = findTrackingParameters(['https://a.test/?utm_source=a&utm_source=b']);
    expect(found).toHaveLength(1);
    expect(found[0]!.occurrences).toBe(1);
  });

  it('ignores untracked query keys entirely', () => {
    expect(findTrackingParameters(['https://a.test/?q=privacy&page=2'])).toEqual([]);
  });

  it('skips a malformed URL instead of losing the whole batch', () => {
    const found = findTrackingParameters(['::::not a url::::', 'https://a.test/?gclid=x']);
    expect(found).toHaveLength(1);
    expect(found[0]!.key).toBe('gclid');
  });

  it('returns findings ordered by occurrence count', () => {
    const found = findTrackingParameters([
      'https://a.test/?utm_source=x',
      'https://a.test/2?utm_source=x',
      'https://a.test/3?utm_source=x',
      'https://a.test/4?fbclid=y',
    ]);
    expect(found[0]!.key).toBe('utm_source');
    expect(found[0]!.occurrences).toBeGreaterThan(found[1]!.occurrences);
  });

  it('has a non-trivial parameter list', () => {
    expect(parameterCount()).toBeGreaterThan(15);
  });
});

describe('stripTrackingParameters', () => {
  it('removes tracking keys and keeps everything else', () => {
    const stripped = stripTrackingParameters(
      'https://a.test/article?utm_source=email&id=42&gclid=abc#top',
    );
    expect(stripped).toBe('https://a.test/article?id=42#top');
  });

  it('leaves a clean URL untouched', () => {
    expect(stripTrackingParameters('https://a.test/x?id=1')).toBe('https://a.test/x?id=1');
  });

  it('returns unparseable input unchanged rather than throwing', () => {
    expect(stripTrackingParameters('not a url')).toBe('not a url');
  });
});

describe('tracking parameters in the privacy score', () => {
  const totals: ScanTotals = {
    totalRequests: 20, blockedRequests: 0, allowedRequests: 20,
    trackersDetected: 0, trackersBlocked: 0, advertisingDomains: 0,
    thirdPartyDomains: 0, cookieCount: 0, httpsShare: 100,
  };
  const base = { totals, trackers: [], cookies: [], thirdPartyRequests: 0 };

  it('is one of five weighted categories that sum to 1', () => {
    const score = calculatePrivacyScore(base);
    expect(score.categories).toHaveLength(5);
    expect(score.categories.reduce((sum, c) => sum + c.weight, 0)).toBeCloseTo(1, 10);
    expect(score.categories.some((c) => c.id === 'trackingParameters')).toBe(true);
  });

  it('lowers the total when parameters are present', () => {
    const clean = calculatePrivacyScore(base).total;
    const tagged = calculatePrivacyScore({
      ...base,
      parameters: [
        { key: 'utm_source', category: 'campaign', operator: 'Google Analytics', occurrences: 1 },
        { key: 'gclid', category: 'click-id', operator: 'Google Ads', occurrences: 1 },
      ],
    }).total;
    expect(tagged).toBeLessThan(clean);
  });

  it('penalises click identifiers more than campaign tags', () => {
    const campaign = calculatePrivacyScore({
      ...base,
      parameters: [{ key: 'utm_source', category: 'campaign', operator: 'GA', occurrences: 1 }],
    });
    const clickId = calculatePrivacyScore({
      ...base,
      parameters: [{ key: 'gclid', category: 'click-id', operator: 'Ads', occurrences: 1 }],
    });
    const find = (s: typeof campaign) => s.categories.find((c) => c.id === 'trackingParameters')!.score;
    expect(find(clickId)).toBeLessThan(find(campaign));
  });

  it('explains itself in both the empty and populated cases', () => {
    const empty = calculatePrivacyScore(base).categories.find((c) => c.id === 'trackingParameters')!;
    expect(empty.score).toBe(100);
    expect(empty.explanation).toMatch(/No known campaign or click-identifier/);

    const populated = calculatePrivacyScore({
      ...base,
      parameters: [{ key: 'gclid', category: 'click-id', operator: 'Ads', occurrences: 3 }],
    }).categories.find((c) => c.id === 'trackingParameters')!;
    expect(populated.explanation).toMatch(/click identifier/);
  });
});

describe('scan engine parameter detection', () => {
  it('finds no parameters on the privacy-friendly profile', () => {
    expect(buildScanResult({ url: 'https://en.wikipedia.org' }).parameters).toEqual([]);
  });

  it('finds parameters on a tracker-heavy site, all from the known list', () => {
    const scan = buildScanResult({ url: 'https://www.nytimes.com' });
    expect(scan.parameters.length).toBeGreaterThan(0);
    scan.parameters.forEach((finding) => expect(matchParameter(finding.key)).not.toBeNull());
  });

  it('reports parameters that are genuinely present in the listed URLs', () => {
    const scan = buildScanResult({ url: 'https://amazon.com' });
    const allUrls = scan.requests.map((request) => request.url).join(' ');
    scan.parameters.forEach((finding) => expect(allUrls).toContain(finding.key));
  });

  it('keeps parameters after a site override, since allowing requests does not untag URLs', () => {
    const scan = buildScanResult({ url: 'https://www.nytimes.com' });
    expect(applySiteOverride(scan).parameters).toEqual(scan.parameters);
  });
});

describe('applyStrictThirdPartyBlocking', () => {
  it('blocks third-party tracker requests a profile left allowed', async () => {
    const { applyStrictThirdPartyBlocking, applySiteOverride } = await import('@/lib/scan/scan-engine');
    const scan = buildScanResult({ url: 'https://www.nytimes.com' });

    // Start from an all-allowed state so there is something to re-block.
    const allowed = applySiteOverride(scan);
    expect(allowed.totals.blockedRequests).toBe(0);

    const strict = applyStrictThirdPartyBlocking(allowed);
    expect(strict.totals.blockedRequests).toBeGreaterThan(0);
    expect(strict.trackers.every((t) => t.action === 'block')).toBe(true);
    expect(strict.privacy.total).toBeGreaterThan(allowed.privacy.total);
  });

  it('never blocks first-party or CDN requests', async () => {
    const { applyStrictThirdPartyBlocking } = await import('@/lib/scan/scan-engine');
    const strict = applyStrictThirdPartyBlocking(buildScanResult({ url: 'https://amazon.com' }));

    strict.requests
      .filter((request) => request.firstParty || request.category === 'cdn')
      .forEach((request) => expect(request.action).toBe('allow'));
  });

  it('leaves a site with no third-party trackers unchanged', async () => {
    const { applyStrictThirdPartyBlocking } = await import('@/lib/scan/scan-engine');
    const scan = buildScanResult({ url: 'https://en.wikipedia.org' });
    expect(applyStrictThirdPartyBlocking(scan).privacy.total).toBe(scan.privacy.total);
  });
});

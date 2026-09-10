import { describe, expect, it } from 'vitest';

import {
  applySiteOverride,
  buildConnectionGraph,
  buildScanResult,
  domainFromInput,
  isFirstParty,
} from '@/lib/scan/scan-engine';
import { profileForDomain } from '@/lib/scan/site-profiles';
import { isTracker } from '@/lib/privacy/tracker-blocklist';

describe('domainFromInput', () => {
  it('accepts bare hosts and full URLs, and strips www', () => {
    expect(domainFromInput('example.com')).toBe('example.com');
    expect(domainFromInput('https://www.Example.com/path?q=1')).toBe('example.com');
    expect(domainFromInput('  http://news.site.org  ')).toBe('news.site.org');
  });

  it('rejects input that is not a host', () => {
    expect(domainFromInput('')).toBeNull();
    expect(domainFromInput('   ')).toBeNull();
    expect(domainFromInput('not a url')).toBeNull();
  });
});

describe('isFirstParty', () => {
  it('treats subdomains of the same registrable domain as first-party', () => {
    expect(isFirstParty('cdn.example.com', 'example.com')).toBe(true);
    expect(isFirstParty('example.com', 'www.example.com')).toBe(true);
  });

  it('treats a different registrable domain as third-party', () => {
    expect(isFirstParty('google-analytics.com', 'example.com')).toBe(false);
  });
});

describe('buildScanResult', () => {
  it('is deterministic: the same domain yields identical scores and counts', () => {
    const a = buildScanResult({ url: 'https://shop.example.net', scannedAt: '2026-01-01T00:00:00.000Z' });
    const b = buildScanResult({ url: 'https://shop.example.net', scannedAt: '2026-06-01T00:00:00.000Z' });

    expect(b.privacy.total).toBe(a.privacy.total);
    expect(b.security.total).toBe(a.security.total);
    expect(b.totals).toEqual(a.totals);
    expect(b.requests.length).toBe(a.requests.length);
  });

  it('produces different reports for different site archetypes', () => {
    const clean = buildScanResult({ url: 'https://en.wikipedia.org' });
    const heavy = buildScanResult({ url: 'https://www.nytimes.com' });

    expect(clean.privacy.total).toBeGreaterThan(heavy.privacy.total);
    expect(clean.totals.trackersDetected).toBe(0);
    expect(heavy.totals.trackersDetected).toBeGreaterThan(5);
  });

  it('always declares its data source, never implying real measurement', () => {
    const scan = buildScanResult({ url: 'https://example.com' });
    expect(scan.dataSource).toBe('simulated-profile');
    expect(scan.profileLabel.length).toBeGreaterThan(0);
  });

  it('only reports tracker findings for domains on the shared blocklist', () => {
    const scan = buildScanResult({ url: 'https://www.cnn.com' });
    expect(scan.trackers.length).toBeGreaterThan(0);
    scan.trackers.forEach((finding) => expect(isTracker(finding.domain)).toBe(true));
  });

  it('classifies first-party requests against the scanned domain', () => {
    const scan = buildScanResult({ url: 'https://example.com' });
    scan.requests
      .filter((request) => request.firstParty)
      .forEach((request) => expect(isFirstParty(request.domain, scan.domain)).toBe(true));
  });

  it('keeps totals consistent with the request list it reports', () => {
    const scan = buildScanResult({ url: 'https://shop.demo-store.com' });
    const { requests, totals } = scan;

    expect(totals.totalRequests).toBe(requests.length);
    expect(totals.blockedRequests).toBe(requests.filter((r) => r.action === 'block').length);
    expect(totals.allowedRequests).toBe(requests.filter((r) => r.action === 'allow').length);
    expect(totals.allowedRequests + totals.blockedRequests).toBe(totals.totalRequests);
    expect(totals.thirdPartyDomains).toBe(
      new Set(requests.filter((r) => !r.firstParty).map((r) => r.domain)).size,
    );
  });

  it('reports httpsShare as 100 when every request is secure', () => {
    const scan = buildScanResult({ url: 'https://en.wikipedia.org' });
    expect(scan.requests.every((r) => r.secure)).toBe(true);
    expect(scan.totals.httpsShare).toBe(100);
  });

  it('gives every blocked request a stated reason', () => {
    const scan = buildScanResult({ url: 'https://www.forbes.com' });
    scan.requests
      .filter((request) => request.action === 'block')
      .forEach((request) => expect(request.reason).toBeTruthy());
  });

  it('throws a clear error for unusable input', () => {
    expect(() => buildScanResult({ url: 'not a url' })).toThrow(/not a valid URL/);
  });

  it('never assumes an unknown domain is privacy-friendly', () => {
    for (const domain of ['random-shop-xyz.com', 'unknown-blog-42.net', 'somesite.io']) {
      expect(profileForDomain(domain).id).not.toBe('privacy-first');
    }
  });
});

describe('buildConnectionGraph', () => {
  it('collapses requests into one node per third-party domain, busiest first', () => {
    const scan = buildScanResult({ url: 'https://www.cnn.com' });
    const graph = buildConnectionGraph(scan);

    expect(graph.root).toBe(scan.domain);
    expect(graph.nodes.every((node) => node.domain !== scan.domain)).toBe(true);
    expect(new Set(graph.nodes.map((n) => n.domain)).size).toBe(graph.nodes.length);

    for (let i = 1; i < graph.nodes.length; i += 1) {
      expect(graph.nodes[i - 1]!.requests).toBeGreaterThanOrEqual(graph.nodes[i]!.requests);
    }
  });

  it('sums node request counts to the third-party request total', () => {
    const scan = buildScanResult({ url: 'https://www.nytimes.com' });
    const graph = buildConnectionGraph(scan);
    const nodeSum = graph.nodes.reduce((sum, node) => sum + node.requests, 0);
    expect(nodeSum).toBe(scan.requests.filter((r) => r.domain !== scan.domain).length);
  });
});

describe('applySiteOverride', () => {
  it('allows every previously blocked request and recomputes the score downward', () => {
    const scan = buildScanResult({ url: 'https://www.nytimes.com' });
    expect(scan.totals.blockedRequests).toBeGreaterThan(0);

    const overridden = applySiteOverride(scan);

    expect(overridden.totals.blockedRequests).toBe(0);
    expect(overridden.requests.every((r) => r.action === 'allow')).toBe(true);
    expect(overridden.trackers.every((t) => t.action === 'allow')).toBe(true);
    // Trackers are still present, just no longer stopped, so privacy must drop.
    expect(overridden.privacy.total).toBeLessThan(scan.privacy.total);
    expect(overridden.totals.trackersDetected).toBe(scan.totals.trackersDetected);
  });

  it('leaves a site with nothing blocked unchanged in score', () => {
    const scan = buildScanResult({ url: 'https://en.wikipedia.org' });
    const overridden = applySiteOverride(scan);
    expect(overridden.privacy.total).toBe(scan.privacy.total);
  });
});

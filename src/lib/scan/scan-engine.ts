/**
 * Builds a ScanResult for a URL.
 *
 * Deterministic: the same URL always produces the same report, driven by the
 * site profile and a seeded generator. That is a requirement, not a shortcut —
 * score history (spec §14) is only meaningful if a re-scan of an unchanged site
 * does not wander.
 *
 * Classification reuses the existing privacy layer rather than duplicating it:
 * `TRACKER_BLOCKLIST` decides what is a tracker, `baseDomain` decides
 * first-vs-third party. One definition of "tracker" across the whole app.
 */

import { baseDomain } from '@/lib/privacy/url';
import { TRACKER_BLOCKLIST, type TrackerRule } from '@/lib/privacy/tracker-blocklist';
import { calculatePrivacyScore } from '@/lib/scan/privacy-score';
import { calculateSecurityScore } from '@/lib/scan/security-score';
import { profileForDomain, type SiteProfile } from '@/lib/scan/site-profiles';
import { findTrackingParameters } from '@/lib/scan/tracking-parameters';
import type {
  ConnectionGraph,
  CookieFinding,
  GraphNode,
  RequestCategory,
  RequestRecord,
  ResourceType,
  ScanResult,
  ScanTotals,
  TrackerFinding,
} from '@/lib/scan/types';

/** Benign third-party hosts, used so not every off-origin request is a tracker. */
const CDN_HOSTS: readonly string[] = [
  'cdn.jsdelivr.net',
  'fonts.gstatic.com',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'images.cdn-provider.net',
];

/**
 * Mulberry32 PRNG. Seeded from the domain so output is stable across reloads,
 * processes and machines — `Math.random()` would break determinism.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Maps a blocklist category onto a request category. */
function categoryFromRule(rule: TrackerRule): RequestCategory {
  switch (rule.category) {
    case 'analytics':
      return 'analytics';
    case 'advertising':
      return 'advertising';
    case 'social':
      return 'social';
    case 'fingerprinting':
      return 'fingerprinting';
    default:
      return 'analytics';
  }
}

/** Resource type a tracker request would plausibly use. */
function trackerResourceType(rule: TrackerRule): ResourceType {
  if (rule.category === 'advertising') return 'pixel';
  if (rule.category === 'social') return 'script';
  return 'xhr';
}

/**
 * First-party vs third-party, by registrable domain. `cdn.example.com` counts
 * as first-party for `example.com`, matching how browsers scope this.
 */
export function isFirstParty(requestDomain: string, siteDomain: string): boolean {
  return baseDomain(requestDomain) === baseDomain(siteDomain);
}

function buildFirstPartyRequests(
  profile: SiteProfile,
  domain: string,
  random: () => number,
): readonly RequestRecord[] {
  const records: RequestRecord[] = [];
  const paths = ['/', '/app.css', '/main.js', '/vendor.js', '/logo.svg', '/hero.webp', '/api/config'];

  // Campaign parameters ride on the landing URL, not on asset requests, which
  // is where they appear in practice.
  const query =
    profile.urlParameters.length > 0
      ? `?${profile.urlParameters.map((key, i) => `${key}=${demoParameterValue(key, i)}`).join('&')}`
      : '';

  for (let index = 0; index < profile.firstPartyRequests; index += 1) {
    const resourceType =
      index === 0
        ? 'document'
        : (profile.resourceMix[index % profile.resourceMix.length] ?? 'script');
    const path =
      index === 0 ? `/${query}` : (paths[index % paths.length] ?? `/asset-${index}`);
    // A profile's insecureShare drives how many subresources fall back to http;
    // the main document is always https so the scheme badge stays coherent.
    const secure = index === 0 ? true : random() >= profile.insecureShare;

    records.push({
      id: `fp-${index}`,
      domain,
      url: `${secure ? 'https' : 'http'}://${domain}${path}`,
      resourceType,
      firstParty: true,
      category: index === 0 ? 'content' : 'functional',
      action: 'allow',
      secure,
    });
  }

  return records;
}

function buildBenignThirdParty(profile: SiteProfile, random: () => number): readonly RequestRecord[] {
  const records: RequestRecord[] = [];

  for (let index = 0; index < profile.benignThirdParty; index += 1) {
    const host = CDN_HOSTS[Math.floor(random() * CDN_HOSTS.length)] ?? CDN_HOSTS[0]!;
    records.push({
      id: `tp-${index}`,
      domain: host,
      url: `https://${host}/lib/bundle-${index}.js`,
      resourceType: index % 3 === 0 ? 'font' : 'script',
      firstParty: false,
      category: 'cdn',
      action: 'allow',
      secure: true,
    });
  }

  return records;
}

/**
 * Tracker requests, drawn deterministically from the shared blocklist.
 *
 * Every one is marked `action: 'block'`: these domains are on MiniTor's
 * blocklist, and the report's job is to show what the privacy rules would stop.
 * A site-level override flips them back to allowed — see `applySiteOverride`.
 */
function buildTrackerRequests(
  profile: SiteProfile,
  random: () => number,
): { requests: readonly RequestRecord[]; trackers: readonly TrackerFinding[] } {
  if (profile.trackerDomainCount === 0) return { requests: [], trackers: [] };

  const offset = Math.floor(random() * TRACKER_BLOCKLIST.length);
  const rules: TrackerRule[] = [];
  for (let index = 0; index < profile.trackerDomainCount; index += 1) {
    const rule = TRACKER_BLOCKLIST[(offset + index * 3) % TRACKER_BLOCKLIST.length];
    if (rule && !rules.includes(rule)) rules.push(rule);
  }

  const requests: RequestRecord[] = [];
  const trackers: TrackerFinding[] = [];

  rules.forEach((rule, ruleIndex) => {
    // Vary call counts so the breakdown is not a flat bar chart.
    const callCount = Math.max(1, profile.requestsPerTracker + (ruleIndex % 2 === 0 ? 0 : -1));

    for (let call = 0; call < callCount; call += 1) {
      requests.push({
        id: `tr-${ruleIndex}-${call}`,
        domain: rule.domain,
        url: `https://${rule.domain}/collect?v=2&sid=${ruleIndex}${call}`,
        resourceType: trackerResourceType(rule),
        firstParty: false,
        category: categoryFromRule(rule),
        action: 'block',
        secure: true,
        reason: `On MiniTor’s blocklist (${rule.category}, ${rule.operator})`,
      });
    }

    trackers.push({
      domain: rule.domain,
      operator: rule.operator,
      category: rule.category,
      requests: callCount,
      action: 'block',
    });
  });

  return { requests, trackers };
}

function buildCookies(profile: SiteProfile, domain: string): readonly CookieFinding[] {
  return profile.cookies.map((spec) => {
    const warnings: string[] = [];
    if (!spec.firstParty && (spec.type === 'analytics' || spec.type === 'advertising')) {
      warnings.push('Third-party tracking cookie — can correlate you across sites.');
    }
    if (!spec.secure) warnings.push('Missing Secure attribute — may be sent over plain http.');
    if (!spec.httpOnly) warnings.push('Missing HttpOnly attribute — readable by page scripts.');

    return {
      name: spec.name,
      domain: spec.domain ?? domain,
      type: spec.type,
      firstParty: spec.firstParty,
      secure: spec.secure,
      httpOnly: spec.httpOnly,
      warnings,
    };
  });
}

function computeTotals(
  requests: readonly RequestRecord[],
  trackers: readonly TrackerFinding[],
  cookies: readonly CookieFinding[],
): ScanTotals {
  const blocked = requests.filter((request) => request.action === 'block');
  const thirdParty = requests.filter((request) => !request.firstParty);
  const secure = requests.filter((request) => request.secure);

  const thirdPartyDomains = new Set(thirdParty.map((request) => request.domain));
  const advertisingDomains = new Set(
    requests.filter((request) => request.category === 'advertising').map((request) => request.domain),
  );

  return {
    totalRequests: requests.length,
    blockedRequests: blocked.length,
    allowedRequests: requests.length - blocked.length,
    trackersDetected: trackers.length,
    trackersBlocked: trackers.filter((tracker) => tracker.action === 'block').length,
    advertisingDomains: advertisingDomains.size,
    thirdPartyDomains: thirdPartyDomains.size,
    cookieCount: cookies.length,
    httpsShare: requests.length === 0 ? 100 : Math.round((secure.length / requests.length) * 100),
  };
}

/** Normalises input into a hostname, accepting bare hosts and full URLs. */
export function domainFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const { hostname } = new URL(candidate);
    return hostname.length > 0 ? hostname.toLowerCase().replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

/**
 * Produces a full scan report.
 *
 * `scannedAt` is injected rather than read from the clock inside, so tests and
 * seeded history can produce reports at chosen times.
 */
export function buildScanResult(input: {
  readonly url: string;
  readonly scannedAt?: string;
  readonly id?: string;
}): ScanResult {
  const domain = domainFromInput(input.url);
  if (!domain) throw new Error(`Cannot scan "${input.url}": not a valid URL or hostname.`);

  const profile = profileForDomain(domain);
  const random = createRandom(seedFrom(domain));

  const firstParty = buildFirstPartyRequests(profile, domain, random);
  const benign = buildBenignThirdParty(profile, random);
  const { requests: trackerRequests, trackers } = buildTrackerRequests(profile, random);

  const requests = [...firstParty, ...benign, ...trackerRequests];
  const cookies = buildCookies(profile, domain);
  const totals = computeTotals(requests, trackers, cookies);

  // Detected from the generated URLs rather than read off the profile, so the
  // findings always agree with the request list the report displays.
  const parameters = findTrackingParameters(requests.map((request) => request.url));

  const privacy = calculatePrivacyScore({
    totals,
    trackers,
    cookies,
    thirdPartyRequests: requests.filter((request) => !request.firstParty).length,
    parameters,
  });

  const security = calculateSecurityScore(
    profile.security.map((spec) => ({
      id: spec.id,
      title: spec.title,
      status: spec.status,
      severity: spec.severity,
      description: spec.description,
    })),
  );

  return {
    id: input.id ?? `scan-${domain}-${seedFrom(domain)}`,
    url: /^https?:\/\//i.test(input.url) ? input.url : `https://${domain}`,
    domain,
    scannedAt: input.scannedAt ?? new Date().toISOString(),
    // A page cannot observe another origin's traffic, so a third-party scan is
    // profile-driven. Stated in the type, surfaced in the report header.
    dataSource: 'simulated-profile',
    profileLabel: profile.label,
    privacy,
    security,
    totals,
    requests,
    trackers,
    cookies,
    parameters,
  };
}

/** Deterministic placeholder value for a demo tracking parameter. */
function demoParameterValue(key: string, index: number): string {
  if (key.startsWith('utm_')) return ['newsletter', 'email', 'spring-promo', 'sidebar'][index % 4]!;
  // Click identifiers are opaque per-click strings; shape matters, not content.
  return `demo${(index + 3) * 7919}`;
}

/** Collapses requests into graph nodes, one per domain (spec §7). */
export function buildConnectionGraph(scan: ScanResult): ConnectionGraph {
  const byDomain = new Map<string, GraphNode>();

  for (const request of scan.requests) {
    const existing = byDomain.get(request.domain);
    if (existing) {
      byDomain.set(request.domain, { ...existing, requests: existing.requests + 1 });
      continue;
    }
    byDomain.set(request.domain, {
      domain: request.domain,
      category: request.category,
      requests: 1,
      firstParty: request.firstParty,
      action: request.action,
    });
  }

  return {
    root: scan.domain,
    nodes: [...byDomain.values()]
      .filter((node) => node.domain !== scan.domain)
      .sort((a, b) => b.requests - a.requests),
  };
}

/**
 * Re-derives a scan with every third-party tracker blocked, for the strict
 * per-site control (spec §11). The inverse of `applySiteOverride`: it blocks
 * third-party requests in a tracking category that a profile left allowed.
 *
 * Scores are recomputed rather than patched, so the report stays internally
 * consistent with the decisions displayed.
 */
export function applyStrictThirdPartyBlocking(scan: ScanResult): ScanResult {
  const TRACKING: ReadonlySet<RequestCategory> = new Set([
    'analytics',
    'advertising',
    'social',
    'fingerprinting',
  ]);

  const requests = scan.requests.map((request) =>
    !request.firstParty && TRACKING.has(request.category)
      ? {
          ...request,
          action: 'block' as const,
          reason: 'Blocked by the site rule “block third-party trackers”',
        }
      : request,
  );
  const trackers = scan.trackers.map((tracker) => ({ ...tracker, action: 'block' as const }));
  const totals = computeTotals(requests, trackers, scan.cookies);

  return {
    ...scan,
    requests,
    trackers,
    totals,
    privacy: calculatePrivacyScore({
      totals,
      trackers,
      cookies: scan.cookies,
      thirdPartyRequests: requests.filter((request) => !request.firstParty).length,
      parameters: scan.parameters,
    }),
  };
}

/**
 * Re-derives a scan as if the site's trackers were allowed through, for the
 * per-site override (spec §11). Scores are recomputed rather than patched, so
 * the report stays internally consistent with the new decisions.
 */
export function applySiteOverride(scan: ScanResult): ScanResult {
  const requests = scan.requests.map((request) =>
    request.action === 'block'
      ? { ...request, action: 'allow' as const, reason: 'Allowed by a temporary site override' }
      : request,
  );
  const trackers = scan.trackers.map((tracker) => ({ ...tracker, action: 'allow' as const }));
  const totals = computeTotals(requests, trackers, scan.cookies);

  return {
    ...scan,
    requests,
    trackers,
    totals,
    privacy: calculatePrivacyScore({
      totals,
      trackers,
      cookies: scan.cookies,
      thirdPartyRequests: requests.filter((request) => !request.firstParty).length,
      // An override allows blocked requests through; it does not remove the
      // tracking parameters already present in the URLs.
      parameters: scan.parameters,
    }),
  };
}

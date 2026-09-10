/**
 * Site profiles that drive simulated scans (spec §21).
 *
 * Five archetypes, so different URLs produce genuinely different reports rather
 * than one set of numbers with the domain swapped. A domain is mapped to a
 * profile deterministically, so re-scanning the same site is reproducible —
 * which is what makes score history (spec §14) meaningful instead of noise.
 *
 * This file is the seam a real backend would replace: swap profile lookup for
 * measured data and every downstream service and component still works.
 */

import type { CookieType, ResourceType, Severity } from '@/lib/scan/types';

export type ProfileId = 'privacy-first' | 'commercial' | 'news' | 'ecommerce' | 'social';

export type CookieSpec = {
  readonly name: string;
  readonly type: CookieType;
  readonly firstParty: boolean;
  readonly secure: boolean;
  readonly httpOnly: boolean;
  /** Host for third-party cookies; first-party ones use the scanned domain. */
  readonly domain?: string;
};

export type SecuritySpec = {
  readonly id: string;
  readonly title: string;
  readonly status: 'pass' | 'warn';
  readonly severity: Severity;
  readonly description: string;
};

export type SiteProfile = {
  readonly id: ProfileId;
  readonly label: string;
  /** One line shown in the report, describing the archetype. */
  readonly summary: string;
  /** First-party requests: the site's own content and assets. */
  readonly firstPartyRequests: number;
  /** Third-party non-tracking requests (CDNs, fonts, embeds). */
  readonly benignThirdParty: number;
  /** How many blocklist entries this profile pulls in. */
  readonly trackerDomainCount: number;
  /** Requests per tracker domain, so heavy sites also repeat calls. */
  readonly requestsPerTracker: number;
  /** Share of requests over http rather than https, 0–1. */
  readonly insecureShare: number;
  readonly cookies: readonly CookieSpec[];
  readonly security: readonly SecuritySpec[];
  /** Resource mix used when generating first-party requests. */
  readonly resourceMix: readonly ResourceType[];
};

const HTTPS_PASS: SecuritySpec = {
  id: 'https',
  title: 'HTTPS enabled',
  status: 'pass',
  severity: 'low',
  description: 'The document loaded over an encrypted connection.',
};

const HSTS_PASS: SecuritySpec = {
  id: 'hsts',
  title: 'HSTS enabled',
  status: 'pass',
  severity: 'low',
  description:
    'A Strict-Transport-Security header was observed, so browsers will refuse a plain-http downgrade on later visits.',
};

const HSTS_WARN: SecuritySpec = {
  id: 'hsts',
  title: 'No HSTS header observed',
  status: 'warn',
  severity: 'medium',
  description:
    'Without Strict-Transport-Security, a first visit over http can be intercepted before any redirect to https happens.',
};

const CSP_WARN: SecuritySpec = {
  id: 'csp',
  title: 'No Content-Security-Policy observed',
  status: 'warn',
  severity: 'medium',
  description:
    'A CSP restricts which origins may serve scripts. Without one, an injected script faces no origin restriction.',
};

const CSP_PASS: SecuritySpec = {
  id: 'csp',
  title: 'Content-Security-Policy present',
  status: 'pass',
  severity: 'low',
  description: 'A CSP was observed, limiting which origins may load scripts and other resources.',
};

const THIRD_PARTY_WARN: SecuritySpec = {
  id: 'third-party-scripts',
  title: 'Third-party scripts detected',
  status: 'warn',
  severity: 'medium',
  description:
    'Scripts from other origins run with the same access to this page as the site’s own code.',
};

const MIXED_CONTENT_WARN: SecuritySpec = {
  id: 'mixed-content',
  title: 'Insecure http resources observed',
  status: 'warn',
  severity: 'high',
  description:
    'Some subresources loaded over plain http. Those specific requests are readable and modifiable in transit.',
};

const SECURE_COOKIES_PASS: SecuritySpec = {
  id: 'secure-cookies',
  title: 'Cookies set with Secure and HttpOnly',
  status: 'pass',
  severity: 'low',
  description: 'Observed cookies carry both flags, so scripts cannot read them and they require https.',
};

const SECURE_COOKIES_WARN: SecuritySpec = {
  id: 'secure-cookies',
  title: 'Some cookies missing security attributes',
  status: 'warn',
  severity: 'medium',
  description: 'At least one cookie lacked Secure or HttpOnly, leaving it readable by page scripts.',
};

export const SITE_PROFILES: Readonly<Record<ProfileId, SiteProfile>> = {
  'privacy-first': {
    id: 'privacy-first',
    label: 'Privacy-friendly site',
    summary:
      'Serves its own assets and calls no known tracker domains in this scan.',
    firstPartyRequests: 24,
    benignThirdParty: 2,
    trackerDomainCount: 0,
    requestsPerTracker: 0,
    insecureShare: 0,
    cookies: [
      { name: 'session', type: 'session', firstParty: true, secure: true, httpOnly: true },
    ],
    security: [HTTPS_PASS, HSTS_PASS, CSP_PASS, SECURE_COOKIES_PASS],
    resourceMix: ['document', 'stylesheet', 'script', 'font', 'image'],
  },

  commercial: {
    id: 'commercial',
    label: 'Average commercial site',
    summary: 'A typical marketing site: a handful of analytics calls alongside its own content.',
    firstPartyRequests: 48,
    benignThirdParty: 9,
    trackerDomainCount: 5,
    requestsPerTracker: 2,
    insecureShare: 0,
    cookies: [
      { name: 'session', type: 'session', firstParty: true, secure: true, httpOnly: true },
      { name: '_ga', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'google-analytics.com' },
      { name: '_gid', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'google-analytics.com' },
      { name: 'consent', type: 'functional', firstParty: true, secure: true, httpOnly: false },
    ],
    security: [HTTPS_PASS, HSTS_PASS, CSP_WARN, THIRD_PARTY_WARN, SECURE_COOKIES_WARN],
    resourceMix: ['document', 'stylesheet', 'script', 'image', 'xhr', 'font'],
  },

  news: {
    id: 'news',
    label: 'Tracker-heavy news site',
    summary:
      'Ad-funded publishing: many advertising and analytics domains, several called repeatedly.',
    firstPartyRequests: 86,
    benignThirdParty: 18,
    trackerDomainCount: 16,
    requestsPerTracker: 4,
    insecureShare: 0.04,
    cookies: [
      { name: 'session', type: 'session', firstParty: true, secure: true, httpOnly: true },
      { name: '_ga', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'google-analytics.com' },
      { name: '__gads', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'doubleclick.net' },
      { name: 'uid', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'criteo.com' },
      { name: 'taboola_sess', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'taboola.com' },
      { name: 'paywall_count', type: 'functional', firstParty: true, secure: false, httpOnly: false },
      { name: '_fbp', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'facebook.net' },
    ],
    security: [HTTPS_PASS, HSTS_WARN, CSP_WARN, THIRD_PARTY_WARN, MIXED_CONTENT_WARN, SECURE_COOKIES_WARN],
    resourceMix: ['document', 'script', 'image', 'xhr', 'pixel', 'stylesheet', 'media'],
  },

  ecommerce: {
    id: 'ecommerce',
    label: 'Ecommerce site',
    summary:
      'Conversion-focused: advertising and remarketing domains, plus its own product assets.',
    firstPartyRequests: 72,
    benignThirdParty: 12,
    trackerDomainCount: 11,
    requestsPerTracker: 3,
    insecureShare: 0,
    cookies: [
      { name: 'cart', type: 'functional', firstParty: true, secure: true, httpOnly: true },
      { name: 'session', type: 'session', firstParty: true, secure: true, httpOnly: true },
      { name: '_ga', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'google-analytics.com' },
      { name: '_gcl_au', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'googleadservices.com' },
      { name: 'cto_bundle', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'criteo.com' },
    ],
    security: [HTTPS_PASS, HSTS_PASS, CSP_WARN, THIRD_PARTY_WARN, SECURE_COOKIES_WARN],
    resourceMix: ['document', 'stylesheet', 'script', 'image', 'xhr', 'pixel'],
  },

  social: {
    id: 'social',
    label: 'Social-heavy site',
    summary: 'Embedded social widgets and pixels dominate the third-party activity in this scan.',
    firstPartyRequests: 58,
    benignThirdParty: 10,
    trackerDomainCount: 13,
    requestsPerTracker: 4,
    insecureShare: 0,
    cookies: [
      { name: 'session', type: 'session', firstParty: true, secure: true, httpOnly: true },
      { name: '_fbp', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'facebook.net' },
      { name: 'tt_sessionId', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'analytics.tiktok.com' },
      { name: 'li_sugr', type: 'advertising', firstParty: false, secure: false, httpOnly: false, domain: 'ads.linkedin.com' },
      { name: '_clck', type: 'analytics', firstParty: false, secure: false, httpOnly: false, domain: 'clarity.ms' },
    ],
    security: [HTTPS_PASS, HSTS_PASS, CSP_WARN, THIRD_PARTY_WARN, SECURE_COOKIES_WARN],
    resourceMix: ['document', 'script', 'image', 'xhr', 'pixel', 'stylesheet'],
  },
};

/**
 * Domains whose archetype we can state rather than infer. Keeps the demo
 * predictable for the sites the curated start page already offers.
 */
const KNOWN_DOMAINS: Readonly<Record<string, ProfileId>> = {
  'wikipedia.org': 'privacy-first',
  'wikibooks.org': 'privacy-first',
  'wikisource.org': 'privacy-first',
  'wiktionary.org': 'privacy-first',
  'wikiquote.org': 'privacy-first',
  'wikivoyage.org': 'privacy-first',
  'wikimedia.org': 'privacy-first',
  'mozilla.org': 'privacy-first',
  'archive.org': 'privacy-first',
  'openlibrary.org': 'privacy-first',
  'rfc-editor.org': 'privacy-first',
  'example.com': 'privacy-first',
  'minitor.local': 'privacy-first',
  'nytimes.com': 'news',
  'cnn.com': 'news',
  'bbc.co.uk': 'news',
  'theguardian.com': 'news',
  'forbes.com': 'news',
  'amazon.com': 'ecommerce',
  'ebay.com': 'ecommerce',
  'shopify.com': 'ecommerce',
  'etsy.com': 'ecommerce',
  'facebook.com': 'social',
  'instagram.com': 'social',
  'x.com': 'social',
  'tiktok.com': 'social',
  'linkedin.com': 'social',
  'reddit.com': 'social',
};

const FALLBACK_ORDER: readonly ProfileId[] = ['commercial', 'news', 'ecommerce', 'social'];

/** Stable hash, so an unknown domain always lands on the same profile. */
function hashDomain(domain: string): number {
  let hash = 2166136261;
  for (let index = 0; index < domain.length; index += 1) {
    hash ^= domain.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Chooses a profile for a domain. Known domains are mapped explicitly; anything
 * else is hashed onto one of the commercial archetypes — never onto
 * `privacy-first`, since claiming an unknown site is clean would be the one
 * wrong answer to guess.
 */
export function profileForDomain(domain: string): SiteProfile {
  const normalised = domain.toLowerCase().replace(/^www\./, '');

  const exact = KNOWN_DOMAINS[normalised];
  if (exact) return SITE_PROFILES[exact];

  const suffixMatch = Object.keys(KNOWN_DOMAINS).find(
    (known) => normalised === known || normalised.endsWith(`.${known}`),
  );
  if (suffixMatch) return SITE_PROFILES[KNOWN_DOMAINS[suffixMatch]!];

  const index = hashDomain(normalised) % FALLBACK_ORDER.length;
  return SITE_PROFILES[FALLBACK_ORDER[index]!];
}

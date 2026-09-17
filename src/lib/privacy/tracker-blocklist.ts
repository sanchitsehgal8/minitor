/**
 * Known tracker and ad-serving domains.
 *
 * Objective 4 is SIMULATED for cross-origin pages and REAL for the app's own
 * demo pages. The distinction is carried in the type system: every log event
 * records which of the two it was, so the UI cannot claim an enforcement that
 * did not happen. See `PrivacyEvent.enforcement`.
 */

export type TrackerCategory = 'analytics' | 'advertising' | 'social' | 'fingerprinting';

export type TrackerRule = {
  readonly domain: string;
  readonly category: TrackerCategory;
  readonly operator: string;
  /**
   * Optional path prefix. Present only for endpoints where the *host* is not
   * itself a tracker — `facebook.com` serves the site, `facebook.com/tr` is the
   * pixel — so blocking must be narrowed to the path rather than the domain.
   */
  readonly pathPrefix?: string;
};

export const TRACKER_BLOCKLIST: readonly TrackerRule[] = [
  { domain: 'google-analytics.com', category: 'analytics', operator: 'Google' },
  { domain: 'analytics.google.com', category: 'analytics', operator: 'Google' },
  { domain: 'googletagmanager.com', category: 'analytics', operator: 'Google' },
  { domain: 'doubleclick.net', category: 'advertising', operator: 'Google' },
  { domain: 'googlesyndication.com', category: 'advertising', operator: 'Google' },
  { domain: 'googleadservices.com', category: 'advertising', operator: 'Google' },
  { domain: 'adservice.google.com', category: 'advertising', operator: 'Google' },
  { domain: 'facebook.net', category: 'social', operator: 'Meta' },
  { domain: 'connect.facebook.net', category: 'social', operator: 'Meta' },
  { domain: 'facebook.com', pathPrefix: '/tr', category: 'social', operator: 'Meta' },
  { domain: 'scorecardresearch.com', category: 'analytics', operator: 'Comscore' },
  { domain: 'quantserve.com', category: 'analytics', operator: 'Quantcast' },
  { domain: 'hotjar.com', category: 'analytics', operator: 'Hotjar' },
  { domain: 'mixpanel.com', category: 'analytics', operator: 'Mixpanel' },
  { domain: 'segment.io', category: 'analytics', operator: 'Twilio Segment' },
  { domain: 'amplitude.com', category: 'analytics', operator: 'Amplitude' },
  { domain: 'branch.io', category: 'analytics', operator: 'Branch' },
  { domain: 'criteo.com', category: 'advertising', operator: 'Criteo' },
  { domain: 'taboola.com', category: 'advertising', operator: 'Taboola' },
  { domain: 'outbrain.com', category: 'advertising', operator: 'Outbrain' },
  { domain: 'pubmatic.com', category: 'advertising', operator: 'PubMatic' },
  { domain: 'rubiconproject.com', category: 'advertising', operator: 'Magnite' },
  { domain: 'adnxs.com', category: 'advertising', operator: 'Xandr' },
  { domain: 'adsrvr.org', category: 'advertising', operator: 'The Trade Desk' },
  { domain: 'bluekai.com', category: 'fingerprinting', operator: 'Oracle' },
  { domain: 'krxd.net', category: 'fingerprinting', operator: 'Salesforce Krux' },
  { domain: 'fingerprintjs.com', category: 'fingerprinting', operator: 'FingerprintJS' },
  { domain: 'clarity.ms', category: 'analytics', operator: 'Microsoft' },
  { domain: 'bat.bing.com', category: 'advertising', operator: 'Microsoft' },
  { domain: 'ads.linkedin.com', category: 'advertising', operator: 'LinkedIn' },
  { domain: 'analytics.tiktok.com', category: 'analytics', operator: 'TikTok' },
  { domain: 'sentry-cdn.com', category: 'analytics', operator: 'Sentry' },
];

export function blocklistSize(): number {
  return TRACKER_BLOCKLIST.length;
}

/**
 * How a rule is identified in reports and logs.
 *
 * Path-scoped rules read as `facebook.com/tr` rather than the bare host, so a
 * finding names the endpoint that was actually blocked instead of implying the
 * whole site is a tracker. `matchTracker` accepts this form back.
 */
export function ruleLabel(rule: TrackerRule): string {
  return rule.pathPrefix ? `${rule.domain}${rule.pathPrefix}` : rule.domain;
}

/**
 * Splits a host-or-URL into a bare hostname and a path, tolerating both
 * `example.com/x` and a full `https://example.com/x?y=1`.
 */
function splitTarget(hostOrUrl: string): { host: string; path: string } {
  const lower = hostOrUrl.trim().toLowerCase();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(lower) ? lower : `https://${lower}`;

  try {
    const url = new URL(withScheme);
    return { host: url.hostname.replace(/^www\./, ''), path: url.pathname };
  } catch {
    // Not parseable as a URL: fall back to a manual split so a bare
    // `example.com/tr` still matches.
    const [rawHost = '', ...rest] = lower.replace(/^https?:\/\//, '').split('/');
    return { host: rawHost.replace(/^www\./, ''), path: rest.length > 0 ? `/${rest.join('/')}` : '/' };
  }
}

/**
 * Exact or subdomain match against the blocklist.
 *
 * Matching is host-based, narrowed by an optional path prefix. The previous
 * implementation compared raw strings, which meant the `facebook.com/tr` entry
 * only matched that literal text: a real `https://www.facebook.com/tr?id=1`
 * carries a scheme, a `www.` and a query, so it matched nothing — a blocklist
 * entry that silently never fired.
 *
 * Accepts a host, a full URL, or a rule label (`facebook.com/tr`), so a finding
 * identified by `ruleLabel` round-trips back through here.
 */
export function matchTracker(hostOrUrl: string): TrackerRule | null {
  const { host, path } = splitTarget(hostOrUrl);
  if (host.length === 0) return null;

  for (const rule of TRACKER_BLOCKLIST) {
    if (host !== rule.domain && !host.endsWith(`.${rule.domain}`)) continue;
    // A path-scoped rule matches only within its path: a plain visit to
    // facebook.com is not the tracking pixel at facebook.com/tr.
    if (rule.pathPrefix && !path.startsWith(rule.pathPrefix)) continue;
    return rule;
  }
  return null;
}

export function isTracker(hostOrUrl: string): boolean {
  return matchTracker(hostOrUrl) !== null;
}

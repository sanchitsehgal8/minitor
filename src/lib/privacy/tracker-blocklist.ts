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
  { domain: 'facebook.com/tr', category: 'social', operator: 'Meta' },
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

const BY_DOMAIN: ReadonlyMap<string, TrackerRule> = new Map(
  TRACKER_BLOCKLIST.map((rule) => [rule.domain, rule]),
);

export function blocklistSize(): number {
  return TRACKER_BLOCKLIST.length;
}

/** Exact or subdomain match against the blocklist. */
export function matchTracker(hostOrUrl: string): TrackerRule | null {
  const needle = hostOrUrl.toLowerCase().replace(/^https?:\/\//, '');
  const direct = BY_DOMAIN.get(needle);
  if (direct) return direct;
  for (const rule of TRACKER_BLOCKLIST) {
    if (needle === rule.domain || needle.startsWith(`${rule.domain}/`)) return rule;
    const host = needle.split('/')[0] ?? '';
    if (host.endsWith(`.${rule.domain}`)) return rule;
  }
  return null;
}

export function isTracker(hostOrUrl: string): boolean {
  return matchTracker(hostOrUrl) !== null;
}

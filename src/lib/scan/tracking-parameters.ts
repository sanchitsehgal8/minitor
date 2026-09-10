/**
 * URL tracking parameters (spec §4).
 *
 * These are the `?utm_source=`/`?gclid=` style query keys that carry campaign
 * and click identifiers. They matter separately from tracker *domains*: a
 * first-party URL on an otherwise clean site can still hand an identifier to
 * whoever reads the link, and stripping them is a different remedy from
 * blocking a request.
 *
 * Pure data + pure functions, like the rest of the policy layer.
 */

export type ParameterCategory = 'campaign' | 'click-id' | 'affiliate';

export type ParameterRule = {
  readonly key: string;
  readonly category: ParameterCategory;
  readonly operator: string;
};

export const TRACKING_PARAMETERS: readonly ParameterRule[] = [
  { key: 'utm_source', category: 'campaign', operator: 'Google Analytics' },
  { key: 'utm_medium', category: 'campaign', operator: 'Google Analytics' },
  { key: 'utm_campaign', category: 'campaign', operator: 'Google Analytics' },
  { key: 'utm_term', category: 'campaign', operator: 'Google Analytics' },
  { key: 'utm_content', category: 'campaign', operator: 'Google Analytics' },
  { key: 'utm_id', category: 'campaign', operator: 'Google Analytics' },
  { key: 'gclid', category: 'click-id', operator: 'Google Ads' },
  { key: 'dclid', category: 'click-id', operator: 'Google Marketing Platform' },
  { key: 'gbraid', category: 'click-id', operator: 'Google Ads' },
  { key: 'wbraid', category: 'click-id', operator: 'Google Ads' },
  { key: 'fbclid', category: 'click-id', operator: 'Meta' },
  { key: 'igshid', category: 'click-id', operator: 'Instagram' },
  { key: 'msclkid', category: 'click-id', operator: 'Microsoft Advertising' },
  { key: 'ttclid', category: 'click-id', operator: 'TikTok' },
  { key: 'twclid', category: 'click-id', operator: 'X / Twitter' },
  { key: 'li_fat_id', category: 'click-id', operator: 'LinkedIn' },
  { key: 'irclickid', category: 'affiliate', operator: 'Impact' },
  { key: 'mc_eid', category: 'affiliate', operator: 'Mailchimp' },
  { key: 'mc_cid', category: 'affiliate', operator: 'Mailchimp' },
  { key: '_hsenc', category: 'affiliate', operator: 'HubSpot' },
  { key: 'vero_id', category: 'affiliate', operator: 'Vero' },
  { key: 'yclid', category: 'click-id', operator: 'Yandex' },
];

export const PARAMETER_CATEGORY_LABEL: Readonly<Record<ParameterCategory, string>> = {
  campaign: 'Campaign tagging',
  'click-id': 'Click identifier',
  affiliate: 'Affiliate / email',
};

const BY_KEY: ReadonlyMap<string, ParameterRule> = new Map(
  TRACKING_PARAMETERS.map((rule) => [rule.key, rule]),
);

export function parameterCount(): number {
  return TRACKING_PARAMETERS.length;
}

export function matchParameter(key: string): ParameterRule | null {
  return BY_KEY.get(key.toLowerCase().trim()) ?? null;
}

export type ParameterFinding = {
  readonly key: string;
  readonly category: ParameterCategory;
  readonly operator: string;
  /** How many observed URLs carried this parameter. */
  readonly occurrences: number;
};

/**
 * Finds tracking parameters across a set of URLs.
 *
 * A malformed URL is skipped rather than throwing: one bad entry in a scan
 * should not lose the analysis of every other request.
 */
export function findTrackingParameters(urls: readonly string[]): readonly ParameterFinding[] {
  const counts = new Map<string, { rule: ParameterRule; occurrences: number }>();

  for (const url of urls) {
    let params: URLSearchParams;
    try {
      params = new URL(url, 'https://minitor.local').searchParams;
    } catch {
      continue;
    }

    // A parameter repeated within one URL counts once for that URL.
    const seenInThisUrl = new Set<string>();
    for (const key of params.keys()) {
      const rule = matchParameter(key);
      if (!rule || seenInThisUrl.has(rule.key)) continue;
      seenInThisUrl.add(rule.key);

      const existing = counts.get(rule.key);
      counts.set(rule.key, {
        rule,
        occurrences: (existing?.occurrences ?? 0) + 1,
      });
    }
  }

  return [...counts.values()]
    .map(({ rule, occurrences }) => ({
      key: rule.key,
      category: rule.category,
      operator: rule.operator,
      occurrences,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.key.localeCompare(b.key));
}

/** Strips known tracking parameters, leaving the rest of the URL intact. */
export function stripTrackingParameters(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  for (const key of [...parsed.searchParams.keys()]) {
    if (matchParameter(key)) parsed.searchParams.delete(key);
  }

  return parsed.toString();
}

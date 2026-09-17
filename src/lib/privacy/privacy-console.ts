/**
 * The privacy console's event model and its deterministic event generator.
 *
 * Honesty is structural here, not a label bolted on: an event cannot exist
 * without an `enforcement` value, and only first-party pages this app serves
 * can produce `'blocked'`. Cross-origin pages produce `'simulated'` events,
 * because JS in the parent frame genuinely cannot observe or cancel requests
 * made inside a cross-origin iframe.
 */

import {
  matchTracker,
  ruleLabel,
  TRACKER_BLOCKLIST,
  type TrackerCategory,
  type TrackerRule,
} from './tracker-blocklist';
import { isFirstPartyDemo } from './embeddable-sites';

export type Enforcement =
  /** Request was genuinely prevented (first-party page under our own CSP). */
  | 'blocked'
  /** Plausible request against the blocklist, shown for demonstration only. */
  | 'simulated';

export type PrivacyEvent = {
  readonly id: string;
  readonly domain: string;
  readonly category: TrackerCategory;
  readonly operator: string;
  readonly enforcement: Enforcement;
  /** Epoch millis. Rendered in the console as HH:MM:SS. */
  readonly at: number;
  /** The page the request would have originated from. */
  readonly pageHost: string;
};

export const ENFORCEMENT_COPY: Record<Enforcement, string> = {
  blocked: 'Blocked',
  simulated: 'Simulated',
};

/**
 * The single source of truth for the demo's honesty disclosure. Rendered in the
 * console header (spec §6) — not a tooltip, not a docs page.
 */
export const SIMULATION_DISCLOSURE =
  'Simulated for this demo — real network-level blocking needs a browser extension or native app.';

export const ENFORCED_DISCLOSURE =
  'Enforced for real on MiniTor-served pages: the tracker scripts are stripped and a Content-Security-Policy blocks the domains outright.';

/**
 * A page's plausible tracker set, derived from the host so the same site always
 * produces the same domains. Deterministic input to a randomised schedule
 * keeps the console believable across reloads instead of looking like noise.
 */
export function plausibleTrackersFor(pageHost: string): readonly TrackerRule[] {
  const seed = [...pageHost].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100_000, 7);
  const count = 3 + (seed % 4);
  const picked: TrackerRule[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = (seed + i * 17) % TRACKER_BLOCKLIST.length;
    const rule = TRACKER_BLOCKLIST[index];
    if (rule && !picked.includes(rule)) picked.push(rule);
  }
  return picked;
}

export function enforcementForPage(url: string): Enforcement {
  return isFirstPartyDemo(url) ? 'blocked' : 'simulated';
}

let sequence = 0;

export function createPrivacyEvent(
  rule: TrackerRule,
  pageHost: string,
  enforcement: Enforcement,
  at: number = Date.now(),
): PrivacyEvent {
  sequence += 1;
  return {
    id: `${at}-${sequence}`,
    domain: ruleLabel(rule),
    category: rule.category,
    operator: rule.operator,
    enforcement,
    at,
    pageHost,
  };
}

/** Builds the event burst for a page load. */
export function eventsForPageLoad(url: string, at: number = Date.now()): readonly PrivacyEvent[] {
  let pageHost: string;
  try {
    pageHost = isFirstPartyDemo(url) ? 'minitor.local' : new URL(url).hostname;
  } catch {
    pageHost = 'unknown';
  }
  const enforcement = enforcementForPage(url);
  return plausibleTrackersFor(pageHost).map((rule, index) =>
    createPrivacyEvent(rule, pageHost, enforcement, at + index * 120),
  );
}

export function formatEventTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-GB', { hour12: false });
}

export { matchTracker };
export type { TrackerCategory, TrackerRule };

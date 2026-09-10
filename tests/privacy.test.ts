import { describe, expect, it } from 'vitest';

import { isKnownEmbeddable, isFirstPartyDemo } from '@/lib/privacy/embeddable-sites';
import {
  enforcementForPage,
  eventsForPageLoad,
  plausibleTrackersFor,
} from '@/lib/privacy/privacy-console';
import { isTracker, matchTracker } from '@/lib/privacy/tracker-blocklist';

describe('tracker blocklist', () => {
  it('matches an exact blocklisted domain', () => {
    expect(matchTracker('google-analytics.com')?.operator).toBe('Google');
  });

  it('matches a subdomain of a blocklisted domain', () => {
    expect(isTracker('ssl.google-analytics.com')).toBe(true);
  });

  it('does not match an unrelated domain that merely contains the name', () => {
    expect(isTracker('not-google-analytics.example.com')).toBe(false);
    expect(isTracker('en.wikipedia.org')).toBe(false);
  });

  it('ignores a scheme prefix', () => {
    expect(isTracker('https://doubleclick.net')).toBe(true);
  });
});

describe('embeddability', () => {
  it('accepts curated hosts and their sibling subdomains', () => {
    expect(isKnownEmbeddable('https://en.wikipedia.org/wiki/Tor')).toBe(true);
    expect(isKnownEmbeddable('https://de.wikipedia.org/wiki/Tor')).toBe(true);
    expect(isKnownEmbeddable('https://example.com/')).toBe(true);
  });

  it('rejects hosts that are not curated', () => {
    expect(isKnownEmbeddable('https://github.com/')).toBe(false);
    expect(isKnownEmbeddable('not a url')).toBe(false);
  });

  it('always allows first-party demo pages', () => {
    expect(isFirstPartyDemo('/demo/tracker-heavy')).toBe(true);
    expect(isKnownEmbeddable('/demo/tracker-heavy')).toBe(true);
  });
});

describe('privacy console honesty', () => {
  it('labels third-party pages as simulated', () => {
    expect(enforcementForPage('https://en.wikipedia.org/wiki/Tor')).toBe('simulated');
  });

  it('labels first-party demo pages as genuinely blocked', () => {
    expect(enforcementForPage('/demo/tracker-heavy')).toBe('blocked');
  });

  it('produces the same tracker set for the same host every time', () => {
    const first = plausibleTrackersFor('en.wikipedia.org').map((rule) => rule.domain);
    const second = plausibleTrackersFor('en.wikipedia.org').map((rule) => rule.domain);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('only ever emits domains that are on the blocklist', () => {
    for (const event of eventsForPageLoad('https://example.com/')) {
      expect(isTracker(event.domain)).toBe(true);
      expect(event.enforcement).toBe('simulated');
    }
  });

  it('gives every event a distinct id', () => {
    const events = eventsForPageLoad('https://example.com/');
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  });
});

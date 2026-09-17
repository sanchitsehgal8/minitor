/**
 * Regression tests.
 *
 * Every case here corresponds to a bug that was actually present and is now
 * fixed. They are grouped by the guarantee they defend rather than by module,
 * because that is what makes a failure here readable: the test name says which
 * product promise just broke.
 */

import { describe, expect, it } from 'vitest';

import { baseDomain } from '@/lib/privacy/url';
import { matchTracker, ruleLabel, TRACKER_BLOCKLIST } from '@/lib/privacy/tracker-blocklist';
import { browserReducer, createInitialState } from '@/lib/browser/tabs';
import { buildScanResult, domainFromInput, isFirstParty } from '@/lib/scan/scan-engine';

describe('baseDomain: first-party classification', () => {
  /**
   * The bug: `baseDomain` kept the last two labels unconditionally, so
   * `bbc.co.uk` became `co.uk` and every unrelated `.co.uk` site was treated as
   * the same party. That is a privacy misclassification — third-party trackers
   * on a `.co.uk` site would have been scored as first-party.
   */
  it('keeps the registrable domain for multi-label public suffixes', () => {
    expect(baseDomain('bbc.co.uk')).toBe('bbc.co.uk');
    expect(baseDomain('www.bbc.co.uk')).toBe('bbc.co.uk');
    expect(baseDomain('news.bbc.co.uk')).toBe('bbc.co.uk');
    expect(baseDomain('example.com.au')).toBe('example.com.au');
    expect(baseDomain('site.co.jp')).toBe('site.co.jp');
  });

  it('does not treat unrelated sites under one suffix as the same party', () => {
    expect(isFirstParty('tracker.co.uk', 'bbc.co.uk')).toBe(false);
    expect(isFirstParty('evil.com.au', 'good.com.au')).toBe(false);
  });

  it('still resolves ordinary domains and subdomains', () => {
    expect(baseDomain('example.com')).toBe('example.com');
    expect(baseDomain('cdn.assets.example.com')).toBe('example.com');
    expect(isFirstParty('cdn.example.com', 'example.com')).toBe(true);
  });

  it('returns IP literals whole rather than slicing them into labels', () => {
    // '127.0.0.1' sliced to its last two labels is '0.1', which would make
    // every address ending in the same two octets look like one party.
    expect(baseDomain('127.0.0.1')).toBe('127.0.0.1');
    expect(baseDomain('192.168.1.1')).toBe('192.168.1.1');
    expect(isFirstParty('10.0.0.1', '192.168.0.1')).toBe(false);
    expect(baseDomain('[::1]')).toBe('[::1]');
  });

  it('ignores a trailing root dot and casing', () => {
    expect(baseDomain('EXAMPLE.COM.')).toBe('example.com');
  });
});

describe('domainFromInput: scheme handling', () => {
  /**
   * The bug: only `https?://` was detected, so `ftp://example.com` was prefixed
   * into `https://ftp://example.com` and parsed to the hostname "ftp" — a scan
   * report for a site that does not exist. The address bar already rejected
   * non-http(s) schemes; these two entry points now agree.
   */
  it('rejects non-http(s) schemes instead of coercing them to a hostname', () => {
    expect(domainFromInput('ftp://example.com')).toBeNull();
    expect(domainFromInput('mailto:someone@example.com')).toBeNull();
    expect(domainFromInput('javascript:alert(1)')).toBeNull();
    expect(domainFromInput('file:///etc/passwd')).toBeNull();
    expect(domainFromInput('data:text/html,<script>')).toBeNull();
  });

  it('accepts bare hosts and http(s) URLs', () => {
    expect(domainFromInput('example.com')).toBe('example.com');
    expect(domainFromInput('https://www.example.com/path?q=1')).toBe('example.com');
    expect(domainFromInput('http://example.com')).toBe('example.com');
    expect(domainFromInput('HTTPS://EXAMPLE.COM')).toBe('example.com');
  });

  it('rejects empty, whitespace and host-less input', () => {
    expect(domainFromInput('')).toBeNull();
    expect(domainFromInput('   ')).toBeNull();
    expect(domainFromInput('https://')).toBeNull();
    expect(domainFromInput('.com')).toBeNull();
  });

  it('strips credentials and ports rather than carrying them into a report', () => {
    expect(domainFromInput('https://user:pass@example.com')).toBe('example.com');
    expect(domainFromInput('example.com:8443')).toBe('example.com');
  });
});

describe('matchTracker: blocklist rules actually fire', () => {
  /**
   * The bug: matching compared raw strings, so the `facebook.com/tr` entry only
   * matched that exact text. A real pixel URL carries a scheme, a `www.` and a
   * query string, so the rule never fired once in production.
   */
  it('matches a path-scoped rule on a realistic pixel URL', () => {
    const match = matchTracker('https://www.facebook.com/tr?id=1&ev=PageView');
    expect(match).not.toBeNull();
    expect(match?.operator).toBe('Meta');
  });

  it('does not block the whole domain because of a path-scoped rule', () => {
    // Visiting facebook.com is not the same as the tracking pixel it serves.
    expect(matchTracker('https://www.facebook.com/')).toBeNull();
    expect(matchTracker('facebook.com')).toBeNull();
  });

  it('matches hosts, subdomains and full URLs alike', () => {
    expect(matchTracker('google-analytics.com')).not.toBeNull();
    expect(matchTracker('https://ssl.google-analytics.com/collect')).not.toBeNull();
    expect(matchTracker('www.doubleclick.net')).not.toBeNull();
  });

  it('does not match unrelated hosts that merely contain a rule as a substring', () => {
    expect(matchTracker('notdoubleclick.net')).toBeNull();
    expect(matchTracker('example.com')).toBeNull();
  });

  it('round-trips every rule through its own label', () => {
    // Guarantees the identity the UI displays is the identity the matcher
    // accepts — the property both the scan engine and the console rely on.
    for (const rule of TRACKER_BLOCKLIST) {
      expect(matchTracker(ruleLabel(rule))).not.toBeNull();
    }
  });
});

describe('close-tab: no silent loss of a tab', () => {
  /**
   * The bug: the "keep at least one tab open" branch ran before the id was
   * validated. A stale id — a double-click, or a click landing after the tab
   * already closed — replaced whichever single tab was open, discarding its
   * navigation stack and page.
   */
  it('ignores a close for an unknown id instead of replacing the open tab', () => {
    const state = createInitialState();
    const before = state.tabs[0]!;
    const after = browserReducer(state, { type: 'close-tab', id: 'no-such-tab' });

    expect(after).toBe(state);
    expect(after.tabs[0]!.id).toBe(before.id);
  });

  it('still replaces the final tab when it is genuinely closed', () => {
    const state = createInitialState();
    const only = state.tabs[0]!;
    const after = browserReducer(state, { type: 'close-tab', id: only.id });

    expect(after.tabs).toHaveLength(1);
    expect(after.tabs[0]!.id).not.toBe(only.id);
    expect(after.activeTabId).toBe(after.tabs[0]!.id);
  });

  it('keeps the replacement private when the last private tab is closed', () => {
    const opened = browserReducer(createInitialState(), { type: 'open-tab', isPrivate: true });
    const privateOnly = { tabs: [opened.tabs[1]!], activeTabId: opened.tabs[1]!.id };

    const after = browserReducer(privateOnly, { type: 'close-tab', id: privateOnly.tabs[0]!.id });
    expect(after.tabs[0]!.isPrivate).toBe(true);
  });
});

describe('scan engine determinism', () => {
  it('produces an identical report for the same URL every time', () => {
    const a = buildScanResult({ url: 'https://www.nytimes.com', scannedAt: 'fixed' });
    const b = buildScanResult({ url: 'https://www.nytimes.com', scannedAt: 'fixed' });
    expect(a).toEqual(b);
  });

  it('scores the same regardless of how the same host was written', () => {
    const bare = buildScanResult({ url: 'nytimes.com', scannedAt: 'fixed' });
    const full = buildScanResult({ url: 'https://www.nytimes.com/', scannedAt: 'fixed' });
    expect(bare.privacy.total).toBe(full.privacy.total);
  });

  it('refuses to scan input it cannot resolve to a host', () => {
    expect(() => buildScanResult({ url: 'ftp://example.com' })).toThrow();
    expect(() => buildScanResult({ url: '' })).toThrow();
  });

  it('declares a data source on every report it produces', () => {
    for (const url of ['wikipedia.org', 'cnn.com', 'amazon.com', 'facebook.com', 'unknown-xyz.dev']) {
      expect(buildScanResult({ url }).dataSource).toBe('simulated-profile');
    }
  });

  it('never maps an unknown domain to the privacy-friendly profile', () => {
    // A flattering default would make the score meaningless for anything the
    // profile table does not already know about.
    const unknown = buildScanResult({ url: 'some-unknown-site-9271.example.net' });
    expect(unknown.privacy.total).toBeLessThan(100);
  });
});

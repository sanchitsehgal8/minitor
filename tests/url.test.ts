import { describe, expect, it } from 'vitest';

import {
  baseDomain,
  formatForDisplay,
  parseAddressBarInput,
  upgradeToHttps,
} from '@/lib/privacy/url';

describe('parseAddressBarInput', () => {
  it('defaults a bare hostname to https, never http', () => {
    const result = parseAddressBarInput('example.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.href).toBe('https://example.com/');
    expect(result.target.isSecure).toBe(true);
  });

  it('preserves an explicit http scheme so the interstitial can report it', () => {
    const result = parseAddressBarInput('http://neverssl.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.scheme).toBe('http');
    expect(result.target.isSecure).toBe(false);
  });

  it('treats non-host input as a search query over https', () => {
    const result = parseAddressBarInput('onion routing');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.isSecure).toBe(true);
    expect(result.target.href).toContain('onion%20routing');
  });

  it('rejects schemes other than http and https', () => {
    for (const input of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,x']) {
      expect(parseAddressBarInput(input).ok).toBe(false);
    }
  });

  it('rejects empty input', () => {
    expect(parseAddressBarInput('   ').ok).toBe(false);
  });

  it('lowercases the hostname while leaving the path alone', () => {
    const result = parseAddressBarInput('https://EN.Wikipedia.ORG/wiki/Tor_(network)');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.hostname).toBe('en.wikipedia.org');
    expect(result.target.href).toContain('/wiki/Tor_(network)');
  });
});

describe('upgradeToHttps', () => {
  it('swaps the scheme and keeps everything else', () => {
    expect(upgradeToHttps('http://example.com/a?b=1#c')).toBe('https://example.com/a?b=1#c');
  });
});

describe('formatForDisplay', () => {
  it('drops the scheme and a bare trailing slash', () => {
    expect(formatForDisplay('https://example.com/')).toBe('example.com');
    expect(formatForDisplay('https://example.com/docs?x=1')).toBe('example.com/docs?x=1');
  });
});

describe('baseDomain', () => {
  it('reduces a subdomain to its registrable-ish base', () => {
    expect(baseDomain('en.wikipedia.org')).toBe('wikipedia.org');
    expect(baseDomain('example.com')).toBe('example.com');
  });
});

/**
 * Address-bar search.
 *
 * The regression these guard: the default engine was DuckDuckGo, which refuses
 * framing, so every search in the shell ended on the "refuses to be embedded"
 * screen rather than on results. A search engine is only useful here if its
 * results can actually render, so that property is asserted rather than
 * assumed.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ENGINE_ID,
  EMBEDDABLE_ENGINES,
  SEARCH_ENGINES,
  engineById,
  queryFromSearchUrl,
  searchUrl,
} from '@/lib/privacy/search';
import { isKnownEmbeddable } from '@/lib/privacy/embeddable-sites';
import { parseAddressBarInput } from '@/lib/privacy/url';

describe('search engines', () => {
  it('defaults to an engine whose results can actually be framed', () => {
    const engine = engineById(DEFAULT_ENGINE_ID);
    expect(engine.embeds).toBe(true);
  });

  it('keeps every framable engine on the shell allowlist', () => {
    // Otherwise a search would be routed straight into the framing-refusal
    // screen by the allowlist check instead of by the site itself.
    for (const engine of EMBEDDABLE_ENGINES) {
      expect(isKnownEmbeddable(searchUrl('test', engine.id))).toBe(true);
    }
  });

  it('falls back to the default for an unknown engine id', () => {
    expect(engineById('not-an-engine').id).toBe(DEFAULT_ENGINE_ID);
    expect(engineById('').id).toBe(DEFAULT_ENGINE_ID);
  });

  it('URL-encodes the query rather than concatenating it raw', () => {
    const url = searchUrl('onion routing & privacy');
    expect(url).toContain('onion%20routing%20%26%20privacy');
    expect(() => new URL(url)).not.toThrow();
  });

  it('marks DuckDuckGo as non-framable so it is never offered as a fix', () => {
    const ddg = SEARCH_ENGINES.find((engine) => engine.id === 'duckduckgo');
    expect(ddg?.embeds).toBe(false);
    expect(EMBEDDABLE_ENGINES.some((engine) => engine.id === 'duckduckgo')).toBe(false);
  });
});

describe('address bar search routing', () => {
  it('sends non-host input to the default search engine', () => {
    const result = parseAddressBarInput('onion routing');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.href).toBe(searchUrl('onion routing'));
      expect(isKnownEmbeddable(result.target.href)).toBe(true);
    }
  });

  it('honours an explicitly chosen engine', () => {
    const result = parseAddressBarInput('onion routing', 'wiby');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.target.hostname).toBe('wiby.me');
  });

  it('still treats anything host-shaped as a URL, not a search', () => {
    const result = parseAddressBarInput('example.com');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.target.hostname).toBe('example.com');
  });

  it('searches for a single word with no dot', () => {
    // The exact case from the bug report: "ncie" is a query, not a host.
    const result = parseAddressBarInput('ncie');
    expect(result.ok).toBe(true);
    if (result.ok) expect(isKnownEmbeddable(result.target.href)).toBe(true);
  });
});

describe('recovering a query from a blocked search URL', () => {
  it('extracts the query from each engine’s own URL shape', () => {
    for (const engine of SEARCH_ENGINES) {
      expect(queryFromSearchUrl(searchUrl('onion routing', engine.id))).toBe('onion routing');
    }
  });

  it('recovers the query from a DuckDuckGo URL so it can be re-run elsewhere', () => {
    expect(queryFromSearchUrl('https://duckduckgo.com/?q=ncie')).toBe('ncie');
  });

  it('returns null for an ordinary page that merely refused framing', () => {
    expect(queryFromSearchUrl('https://example.com/article?q=not-a-search-engine')).toBeNull();
    expect(queryFromSearchUrl('https://news.example.org/')).toBeNull();
  });

  it('returns null rather than throwing on malformed input', () => {
    expect(queryFromSearchUrl('not a url')).toBeNull();
    expect(queryFromSearchUrl('')).toBeNull();
  });

  it('returns null for a search host with no query', () => {
    expect(queryFromSearchUrl('https://marginalia-search.com/search')).toBeNull();
  });
});

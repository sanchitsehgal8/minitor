/**
 * Address-bar search.
 *
 * Choosing a search engine here is constrained by the same limit as the rest of
 * the shell: pages load in an iframe, and almost every mainstream engine sends
 * `X-Frame-Options: DENY` or a restrictive `frame-ancestors`. The browser
 * enforces that before any of MiniTor's code runs.
 *
 * DuckDuckGo was the previous default, which meant every search ended on the
 * "refuses to be embedded" screen instead of results — the feature was
 * reachable but non-functional. Verified by loading each candidate in a real
 * iframe rather than trusting its headers (the `lite.` and `html.` DuckDuckGo
 * endpoints advertise no framing headers to curl and still refuse to frame):
 *
 *   marginalia-search.com   frames, returns results
 *   wiby.me                 frames, returns results
 *   duckduckgo.com          refused  (x-frame-options: SAMEORIGIN)
 *   lite/html.duckduckgo    refused
 *   startpage.com           refused
 *   brave / mojeek          refused  (frame-ancestors)
 *
 * Marginalia is the default: it is a general-purpose, privacy-respecting index
 * whose results render in the frame. The others are offered so a search that
 * finds nothing useful is one click from an engine that will.
 */

export type SearchEngine = {
  readonly id: string;
  readonly name: string;
  /** Query is appended URL-encoded. */
  readonly prefix: string;
  /** Whether results render inside the shell's iframe (verified, not assumed). */
  readonly embeds: boolean;
  readonly blurb: string;
};

export const SEARCH_ENGINES: readonly SearchEngine[] = [
  {
    id: 'marginalia',
    name: 'Marginalia',
    prefix: 'https://marginalia-search.com/search?query=',
    embeds: true,
    blurb: 'Independent index that favours small, non-commercial pages.',
  },
  {
    id: 'wiby',
    name: 'Wiby',
    prefix: 'https://wiby.me/?q=',
    embeds: true,
    blurb: 'Hand-curated index of lightweight pages.',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    prefix: 'https://en.wikipedia.org/w/index.php?search=',
    embeds: true,
    blurb: 'Searches Wikipedia directly.',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    prefix: 'https://duckduckgo.com/?q=',
    embeds: false,
    blurb: 'Refuses framing — opens in a real browser tab.',
  },
];

export const DEFAULT_ENGINE_ID = 'marginalia';

export function engineById(id: string): SearchEngine {
  // Falling back to the default keeps a stale or hand-edited id from making the
  // address bar unusable.
  return (
    SEARCH_ENGINES.find((engine) => engine.id === id) ??
    SEARCH_ENGINES.find((engine) => engine.id === DEFAULT_ENGINE_ID) ??
    SEARCH_ENGINES[0]!
  );
}

/** The URL that searches `query` on `engine`. */
export function searchUrl(query: string, engineId: string = DEFAULT_ENGINE_ID): string {
  return `${engineById(engineId).prefix}${encodeURIComponent(query)}`;
}

/**
 * Recovers the query from a search-engine URL, whichever engine produced it.
 *
 * Used by the framing-refusal screen: if the page that refused was itself a
 * search, the useful recovery is "run that same search somewhere that works",
 * not "go back to the start page and retype it".
 */
export function queryFromSearchUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const isSearchHost = SEARCH_ENGINES.some((engine) => {
    try {
      return new URL(engine.prefix).hostname.toLowerCase().replace(/^www\./, '') === host;
    } catch {
      return false;
    }
  });
  if (!isSearchHost) return null;

  for (const key of ['q', 'query', 'search']) {
    const value = url.searchParams.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

/** Engines whose results actually render inside the shell. */
export const EMBEDDABLE_ENGINES: readonly SearchEngine[] = SEARCH_ENGINES.filter(
  (engine) => engine.embeds,
);

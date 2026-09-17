/**
 * Curated list of sites known to permit framing (spec §6).
 *
 * Most of the web sends `X-Frame-Options: DENY` or a restrictive
 * `Content-Security-Policy: frame-ancestors`, which the parent page cannot
 * detect or override — the browser refuses the load before any JS runs. So the
 * shell ships a known-good list and explains the refusal in plain language
 * rather than showing a blank frame.
 */

export type EmbeddableSite = {
  readonly title: string;
  readonly url: string;
  readonly hostname: string;
  readonly blurb: string;
};

export const EMBEDDABLE_SITES: readonly EmbeddableSite[] = [
  {
    title: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Onion_routing',
    hostname: 'en.wikipedia.org',
    blurb: 'Onion routing — the technique MiniTor is named after.',
  },
  {
    title: 'Wikipedia — Tor',
    url: 'https://en.wikipedia.org/wiki/Tor_(network)',
    hostname: 'en.wikipedia.org',
    blurb: 'The network this project takes its cues from.',
  },
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
    hostname: 'developer.mozilla.org',
    blurb: 'The header that limits what this demo can embed.',
  },
  {
    title: 'MDN — CSP',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
    hostname: 'developer.mozilla.org',
    blurb: 'Content Security Policy reference.',
  },
  {
    title: 'example.com',
    url: 'https://example.com',
    hostname: 'example.com',
    blurb: 'The IANA reserved example domain.',
  },
  {
    title: 'Wikibooks',
    url: 'https://en.wikibooks.org/wiki/Main_Page',
    hostname: 'en.wikibooks.org',
    blurb: 'Open-content textbooks.',
  },
  {
    title: 'Wikisource',
    url: 'https://en.wikisource.org/wiki/Main_Page',
    hostname: 'en.wikisource.org',
    blurb: 'Free library of source texts.',
  },
  {
    title: 'Wiktionary',
    url: 'https://en.wiktionary.org/wiki/Wiktionary:Main_Page',
    hostname: 'en.wiktionary.org',
    blurb: 'Collaborative dictionary.',
  },
  {
    title: 'Wikiquote',
    url: 'https://en.wikiquote.org/wiki/Main_Page',
    hostname: 'en.wikiquote.org',
    blurb: 'Sourced quotations.',
  },
  {
    title: 'Wikivoyage',
    url: 'https://en.wikivoyage.org/wiki/Main_Page',
    hostname: 'en.wikivoyage.org',
    blurb: 'Open travel guide.',
  },
  {
    title: 'Internet Archive',
    url: 'https://archive.org/details/texts',
    hostname: 'archive.org',
    blurb: 'Archived texts collection.',
  },
  {
    title: 'Open Library',
    url: 'https://openlibrary.org/subjects/computer_security',
    hostname: 'openlibrary.org',
    blurb: 'Catalogue of books on computer security.',
  },
  {
    title: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/Main_Page',
    hostname: 'commons.wikimedia.org',
    blurb: 'Freely licensed media.',
  },
  {
    title: 'RFC Editor',
    url: 'https://www.rfc-editor.org/rfc/rfc9110.html',
    hostname: 'www.rfc-editor.org',
    blurb: 'RFC 9110 — HTTP semantics.',
  },
  {
    title: 'Marginalia Search',
    url: 'https://marginalia-search.com/search?query=onion+routing',
    hostname: 'marginalia-search.com',
    blurb: 'The default search engine — one of the few that permits framing.',
  },
  {
    title: 'Wiby',
    url: 'https://wiby.me/?q=onion+routing',
    hostname: 'wiby.me',
    blurb: 'Search engine for small, hand-made pages.',
  },
  {
    title: 'MiniTor demo page',
    url: '/demo/tracker-heavy',
    hostname: 'minitor.local',
    blurb: 'A first-party page where blocking is genuinely enforced.',
  },
];

/**
 * Pages served by this app. Framing them is always allowed, and because we
 * control them, the tracker blocking demonstrated on them is real rather than
 * simulated.
 */
export const FIRST_PARTY_DEMO_PATHS: readonly string[] = ['/demo/tracker-heavy'];

export function isFirstPartyDemo(url: string): boolean {
  return FIRST_PARTY_DEMO_PATHS.some((path) => url === path || url.startsWith(`${path}?`));
}

const ALLOWED_HOSTNAMES: ReadonlySet<string> = new Set(
  EMBEDDABLE_SITES.map((site) => site.hostname).filter((host) => host !== 'minitor.local'),
);

/**
 * Whether a URL is on the curated list. Subdomain-tolerant within the same
 * registrable domain so e.g. `de.wikipedia.org` resolves alongside `en.`.
 */
export function isKnownEmbeddable(href: string): boolean {
  if (isFirstPartyDemo(href)) return true;
  let hostname: string;
  try {
    hostname = new URL(href).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (ALLOWED_HOSTNAMES.has(hostname)) return true;
  return [...ALLOWED_HOSTNAMES].some((allowed) => {
    const suffix = allowed.split('.').slice(-2).join('.');
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  });
}

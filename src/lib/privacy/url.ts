/**
 * URL normalisation and scheme enforcement.
 *
 * Objective 5 (HTTPS-only enforcement) is REAL: it is pure scheme inspection
 * on the URL the user typed, so it has no sandbox limitation. Everything here
 * is a pure function with no DOM or network access, which is what lets the
 * same rules run in the browser and again server-side on write.
 */

export type UrlScheme = 'https' | 'http' | 'unsupported';

export type ParsedTarget = {
  /** Fully-qualified, normalised URL. */
  readonly href: string;
  readonly scheme: UrlScheme;
  readonly hostname: string;
  /** True only for https. Drives the padlock colour. */
  readonly isSecure: boolean;
};

export type ParseResult =
  | { readonly ok: true; readonly target: ParsedTarget }
  | { readonly ok: false; readonly reason: string };

const SEARCH_ENGINE = 'https://duckduckgo.com/?q=';

/**
 * Anything with a dot and no whitespace is treated as a host, matching how
 * real address bars disambiguate a URL from a search query.
 */
function looksLikeHost(input: string): boolean {
  return /^[^\s/]+\.[^\s/]{2,}/.test(input);
}

function toScheme(protocol: string): UrlScheme {
  if (protocol === 'https:') return 'https';
  if (protocol === 'http:') return 'http';
  return 'unsupported';
}

/**
 * Turns raw address-bar text into a navigable target.
 *
 * Bare hosts default to https — never http — so the secure scheme is the one
 * the user gets without asking. A typed `http://` is preserved rather than
 * silently upgraded, because the interstitial (spec §6) has to be able to tell
 * the user what they actually requested.
 */
export function parseAddressBarInput(raw: string): ParseResult {
  const input = raw.trim();
  if (input.length === 0) return { ok: false, reason: 'Enter a URL to navigate.' };

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input);
  let candidate: string;

  if (hasScheme) {
    candidate = input;
  } else if (looksLikeHost(input)) {
    candidate = `https://${input}`;
  } else {
    // Not a host: treat as a search query.
    candidate = `${SEARCH_ENGINE}${encodeURIComponent(input)}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: `"${input}" is not a URL this browser can open.` };
  }

  const scheme = toScheme(url.protocol);
  if (scheme === 'unsupported') {
    return {
      ok: false,
      reason: `MiniTor opens http and https pages only, not ${url.protocol.replace(':', '')}.`,
    };
  }

  if (url.hostname.length === 0) {
    return { ok: false, reason: `"${input}" has no hostname.` };
  }

  return {
    ok: true,
    target: {
      href: url.href,
      scheme,
      hostname: url.hostname.toLowerCase(),
      isSecure: scheme === 'https',
    },
  };
}

/** The https:// equivalent of an http URL, for the interstitial's retry action. */
export function upgradeToHttps(href: string): string {
  const url = new URL(href);
  url.protocol = 'https:';
  return url.href;
}

/** Compact display form: drops the scheme prefix and a trailing bare slash. */
export function formatForDisplay(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname === '/' && !url.search && !url.hash ? '' : url.pathname;
    return `${url.host}${path}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Multi-label public suffixes.
 *
 * A naive "last two labels" rule is wrong for these: it reduces `bbc.co.uk` to
 * `co.uk`, which would make every unrelated `.co.uk` site first-party with
 * every other one — a privacy misclassification, not a cosmetic one, because
 * first-party is exactly what the scan engine uses to decide whether a request
 * counts as third-party tracking.
 *
 * This is a deliberately small list covering the suffixes the app's own
 * profiles and blocklist actually use, not a vendored copy of the full Public
 * Suffix List. A real deployment would depend on `psl`; the trade-off is noted
 * in the README rather than hidden here.
 */
const MULTI_LABEL_SUFFIXES: ReadonlySet<string> = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'me.uk',
  'net.uk',
  'sch.uk',
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'co.nz',
  'net.nz',
  'org.nz',
  'co.za',
  'co.jp',
  'or.jp',
  'ne.jp',
  'ac.jp',
  'co.in',
  'net.in',
  'org.in',
  'ac.in',
  'com.br',
  'com.cn',
  'com.mx',
  'com.sg',
  'com.tr',
  'co.kr',
  'com.hk',
]);

/** IPv4 literal, e.g. `192.168.1.1`. Dotted but not a domain. */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Registrable domain, used for grouping history, matching blocklists and — most
 * importantly — deciding first-vs-third party.
 *
 * IP literals and bracketed IPv6 hosts are returned whole: splitting
 * `127.0.0.1` on dots and keeping the last two labels yields `0.1`, which would
 * make every address ending in the same two octets look like the same party.
 */
export function baseDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  // An IPv6 literal keeps its brackets and contains colons, never dots that
  // delimit labels; an IPv4 literal has no registrable domain either.
  if (host.startsWith('[') || host.includes(':') || IPV4.test(host)) return host;

  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');

  // `bbc.co.uk` → last three labels; `www.example.com` → last two.
  const lastTwo = parts.slice(-2).join('.');
  return MULTI_LABEL_SUFFIXES.has(lastTwo)
    ? parts.slice(-3).join('.')
    : lastTwo;
}

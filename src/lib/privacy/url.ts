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

/** Registrable-ish domain, used for grouping history and matching blocklists. */
export function baseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
}

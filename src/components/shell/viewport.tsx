'use client';

import { EMBEDDABLE_SITES } from '@/lib/privacy/embeddable-sites';
import { upgradeToHttps } from '@/lib/privacy/url';
import type { TabView } from '@/lib/browser/tabs';
import { ShieldIcon } from '@/components/ui/icons';

export function Viewport({
  view,
  reloadToken,
  isPrivate,
  onNavigate,
}: {
  readonly view: TabView;
  readonly reloadToken: number;
  readonly isPrivate: boolean;
  readonly onNavigate: (input: string) => void;
}) {
  switch (view.kind) {
    case 'start':
      return <StartPage isPrivate={isPrivate} onNavigate={onNavigate} />;

    case 'page':
      return (
        <iframe
          // reloadToken in the key forces a remount, which is the only reliable
          // way to re-request a cross-origin page we cannot script into.
          key={`${view.href}-${reloadToken}`}
          src={view.href}
          title="Embedded page"
          className="h-full w-full border-0 bg-white"
          /*
           * Scripts and same-origin are needed for real sites to render at all.
           * `allow-top-navigation` is deliberately withheld, so an embedded
           * page cannot navigate the shell away from MiniTor.
           *
           * `allow-scripts` + `allow-same-origin` together do not sandbox a
           * frame that is genuinely same-origin — that applies only to our own
           * `/demo/*` pages, whose content we author. Every third-party page is
           * cross-origin and therefore still fully isolated: the parent cannot
           * read it, and it cannot reach the parent. That isolation is exactly
           * why the privacy console has to label third-party blocking as
           * simulated.
           */
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      );

    case 'insecure-interstitial':
      return <InsecureInterstitial href={view.href} onNavigate={onNavigate} />;

    case 'not-embeddable':
      return <NotEmbeddable href={view.href} onNavigate={onNavigate} />;

    case 'error':
      return <ErrorState message={view.message} />;

    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

function StartPage({
  isPrivate,
  onNavigate,
}: {
  readonly isPrivate: boolean;
  readonly onNavigate: (input: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-paper px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl text-ink">
          {isPrivate ? 'Private tab' : 'Where to?'}
        </h1>
        <p className="mt-2 max-w-xl text-base text-ash-dim">
          Type any URL in the address bar — HTTPS enforcement works on all of them. Pages only
          render if the site permits being embedded, so here are ones that do.
        </p>

        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {EMBEDDABLE_SITES.map((site) => (
            <li key={site.url}>
              <button
                type="button"
                onClick={() => onNavigate(site.url)}
                className="w-full rounded-lg border border-ash-light bg-white p-4 text-left transition-colors duration-150 hover:border-verdigris hover:bg-verdigris-wash"
              >
                <span className="block font-body text-base font-medium text-ink">{site.title}</span>
                <span className="technical mt-0.5 block truncate text-xs text-ash">
                  {site.hostname}
                </span>
                <span className="mt-1.5 block text-sm text-ash-dim">{site.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InsecureInterstitial({
  href,
  onNavigate,
}: {
  readonly href: string;
  readonly onNavigate: (input: string) => void;
}) {
  const hostname = safeHostname(href);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-paper px-5 py-12">
      <div className="w-full max-w-lg rounded-lg border border-amber bg-amber-wash p-6">
        <p className="flex items-center gap-2 font-body text-sm font-medium text-amber-dim">
          <ShieldIcon />
          Connection is not encrypted
        </p>

        <h1 className="mt-3 font-display text-2xl text-ink">
          {hostname} was requested over http
        </h1>

        <p className="mt-3 text-base text-ink">
          MiniTor did not load this page. Over plain http, anyone between you and this site — your
          network, your internet provider — can read and change what is sent, including anything you
          type into it.
        </p>

        <p className="technical mt-4 break-all rounded-md border border-amber-dim bg-white px-3 py-2 text-sm text-ink">
          {href}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => onNavigate(upgradeToHttps(href))} className="btn-primary">
            Try https instead
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`${href}#minitor-allow-insecure`)}
            className="btn-secondary"
          >
            Load it anyway, unencrypted
          </button>
        </div>

        <p className="mt-4 text-sm text-ash-dim">
          Most sites redirect http to https on their own. If “try https” works, use that.
        </p>
      </div>
    </div>
  );
}

function NotEmbeddable({
  href,
  onNavigate,
}: {
  readonly href: string;
  readonly onNavigate: (input: string) => void;
}) {
  const hostname = safeHostname(href);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-paper px-5 py-12">
      <div className="w-full max-w-lg rounded-lg border border-ash-light bg-white p-6">
        <h1 className="font-display text-2xl text-ink">{hostname} refuses to be embedded</h1>

        <p className="mt-3 text-base text-ink">
          This is not a MiniTor error. {hostname} sends a header —{' '}
          <span className="technical text-sm">X-Frame-Options: DENY</span> or a{' '}
          <span className="technical text-sm">Content-Security-Policy</span> that restricts{' '}
          <span className="technical text-sm">frame-ancestors</span> — telling your browser not to
          display it inside another page.
        </p>

        <p className="mt-3 text-base text-ink">
          Sites do this to prevent clickjacking, where an attacker frames a real login page under an
          invisible overlay. Your browser enforces it before any of MiniTor’s code runs, so the
          refusal cannot be worked around from here — a real browser extension or a native app would
          be needed.
        </p>

        <p className="technical mt-4 break-all rounded-md border border-ash-light bg-paper px-3 py-2 text-sm text-ink">
          {href}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href={href} target="_blank" rel="noreferrer noopener" className="btn-secondary">
            Open in a real browser tab
          </a>
          <button type="button" onClick={() => onNavigate('/')} className="btn-secondary">
            Back to the start page
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-paper px-5 py-12">
      <div className="w-full max-w-lg rounded-lg border border-ash-light bg-white p-6">
        <h1 className="font-display text-2xl text-ink">That did not work</h1>
        <p className="mt-3 text-base text-ink">{message}</p>
      </div>
    </div>
  );
}

function safeHostname(href: string): string {
  try {
    return new URL(href, 'https://minitor.local').hostname;
  } catch {
    return href;
  }
}

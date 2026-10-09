'use client';

import { motion, type Variants } from 'framer-motion';
import { useState, type MouseEvent, type ReactNode } from 'react';

import { EMBEDDABLE_SITES } from '@/lib/privacy/embeddable-sites';
import {
  DEFAULT_ENGINE_ID,
  EMBEDDABLE_ENGINES,
  engineById,
  queryFromSearchUrl,
  searchUrl,
} from '@/lib/privacy/search';
import { upgradeToHttps } from '@/lib/privacy/url';
import type { NavigateFn, TabView } from '@/lib/browser/tabs';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  LayersIcon,
  MaskIcon,
  SearchIcon,
  ShieldIcon,
  UnlockIcon,
  WarnIcon,
} from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/logo';
import { SiteMark } from '@/components/ui/panel-states';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const ENTER_EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

export function Viewport({
  view,
  reloadToken,
  isPrivate,
  onNavigate,
}: {
  readonly view: TabView;
  readonly reloadToken: number;
  readonly isPrivate: boolean;
  readonly onNavigate: NavigateFn;
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
      return <ErrorState message={view.message} onNavigate={onNavigate} />;

    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

/* ── Start page ─────────────────────────────────────────────────────────── */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ENTER_EASE } },
};

const tileList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025, delayChildren: 0.12 } },
};

const tile: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: ENTER_EASE } },
};

/** Feeds the `.spotlight` glow its cursor position. */
function trackSpotlight(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`);
}

/**
 * Search from the start page.
 *
 * Search previously existed only as an address-bar fallback that routed to
 * DuckDuckGo — which refuses framing, so every search dead-ended on the
 * "refuses to be embedded" screen. Surfacing it here, with the engine named,
 * makes the constraint visible instead of surprising.
 *
 * The engine picker is a native radio group dressed as a segmented control:
 * arrow keys, labelling and form semantics come from the platform for free.
 */
function StartSearch({
  isPrivate,
  onNavigate,
}: {
  readonly isPrivate: boolean;
  readonly onNavigate: NavigateFn;
}) {
  const [engineId, setEngineId] = useState(DEFAULT_ENGINE_ID);
  const [query, setQuery] = useState('');
  const engine = engineById(engineId);

  return (
    <form
      className="mt-8 w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length > 0) onNavigate(searchUrl(trimmed, engineId));
      }}
    >
      <label htmlFor="start-search" className="sr-only">
        Search the web
      </label>
      <div
        className={`group relative flex h-14 items-center gap-3 rounded-lg border border-white/10 bg-ink-raised pl-5 pr-1.5 transition-[border-color,box-shadow] duration-200 ease-chrome ${
          isPrivate
            ? 'focus-within:border-amber/50 focus-within:shadow-[0_0_0_4px_rgba(216,162,74,0.12)]'
            : 'focus-within:border-verdigris-bright/50 focus-within:shadow-[0_0_0_4px_rgba(91,194,170,0.12)]'
        }`}
      >
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-ash transition-colors duration-300 group-focus-within:text-parchment" />
        <input
          id="start-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the web"
          className="min-w-0 flex-1 bg-transparent font-body text-base text-parchment outline-none placeholder:text-ash"
        />
        <button type="submit" className="btn-primary h-11 shrink-0 px-4 sm:px-5">
          <span className="hidden sm:inline">Search</span>
          <span className="sr-only sm:hidden">Search</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      <fieldset className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <legend className="sr-only">Engine</legend>
        <span aria-hidden="true" className="eyebrow shrink-0 pl-1">
          Engine
        </span>
        <div className="relative flex w-fit rounded-full border border-white/[0.06] bg-black/30 p-1">
          {EMBEDDABLE_ENGINES.map((option) => {
            const isChecked = option.id === engineId;
            return (
              <label
                key={option.id}
                className={`relative cursor-pointer rounded-full px-3 py-1 font-body text-xs font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verdigris-bright ${
                  isChecked ? 'text-parchment' : 'text-ash hover:text-ash-light'
                }`}
              >
                {isChecked ? (
                  <motion.span
                    layoutId="start-engine-pill"
                    transition={SPRING}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-white/[0.09] bg-gradient-to-b from-white/[0.1] to-white/[0.04] shadow-lift"
                  />
                ) : null}
                <input
                  type="radio"
                  name="start-engine"
                  value={option.id}
                  checked={isChecked}
                  onChange={() => setEngineId(option.id)}
                  className="sr-only"
                />
                <span className="relative">{option.name}</span>
              </label>
            );
          })}
        </div>
        <span className="min-w-0 pl-1 text-xs text-ash sm:pl-0">{engine.blurb}</span>
      </fieldset>
    </form>
  );
}

function StartPage({
  isPrivate,
  onNavigate,
}: {
  readonly isPrivate: boolean;
  readonly onNavigate: NavigateFn;
}) {
  return (
    <div className="relative h-full overflow-hidden bg-ink">
      <Ambient tone={isPrivate ? 'amber' : 'verdigris'} />

      <div className="log-scroll relative h-full overflow-y-auto">
        <motion.div
          // Re-run the entrance when the tab flips mode, so the change reads.
          key={isPrivate ? 'private' : 'standard'}
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mx-auto flex max-w-4xl flex-col px-5 pb-16 pt-10 sm:px-10 sm:pt-16"
        >
          <motion.div variants={rise}>
            {isPrivate ? (
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/10 text-amber-glow ring-1 ring-inset ring-amber/30 shadow-glow-amber">
                <MaskIcon className="h-7 w-7" />
              </span>
            ) : (
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/10 shadow-glow">
                <LogoMark className="h-8 w-8" />
              </span>
            )}
          </motion.div>

          <motion.h1
            variants={rise}
            className={`mt-6 font-display text-4xl sm:text-5xl ${isPrivate ? 'text-amber-glow' : 'text-white'}`}
          >
            {isPrivate ? 'Private tab' : 'Where to?'}
          </motion.h1>

          <motion.p variants={rise} className="mt-4 max-w-xl text-base leading-relaxed text-ash-light">
            Search below, or type any URL in the address bar — HTTPS enforcement works on all of
            them. Pages only render if the site permits being embedded, so here are ones that do.
          </motion.p>

          {isPrivate ? (
            <motion.p
              variants={rise}
              className="mt-4 flex max-w-xl items-start gap-2.5 rounded-xl border border-amber/20 bg-amber/[0.06] px-3.5 py-3 text-sm leading-relaxed text-amber-glow/90"
            >
              <MaskIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <span>
                Nothing opened in this tab is written to your history or bookmarks.{' '}
                <span className="text-parchment">
                  Your network, internet provider and the sites themselves can still see it.
                </span>
              </span>
            </motion.p>
          ) : null}

          <motion.div variants={rise}>
            <StartSearch isPrivate={isPrivate} onNavigate={onNavigate} />
          </motion.div>

          <motion.div variants={rise} className="mt-14 flex items-baseline justify-between gap-4">
            <h2 className="eyebrow">Sites that permit framing</h2>
            <span className="technical text-xs text-ash">{EMBEDDABLE_SITES.length} verified</span>
          </motion.div>

          <motion.ul
            variants={tileList}
            className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {EMBEDDABLE_SITES.map((site) => {
              const isFirstParty = site.url.startsWith('/');
              return (
                <motion.li key={site.url} variants={tile}>
                  <button
                    type="button"
                    onClick={() => onNavigate(site.url)}
                    onMouseMove={trackSpotlight}
                    className={`spotlight group flex h-full w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 active:scale-[0.99] ${
                      isFirstParty
                        ? 'border-verdigris-bright/25 bg-verdigris/[0.07] hover:border-verdigris-bright/45'
                        : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]'
                    }`}
                  >
                    <SiteMark url={site.url} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-body text-sm font-medium text-parchment">
                          {site.title}
                        </span>
                        <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-ash opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                      </span>
                      <span className="technical mt-0.5 block truncate text-xs text-ash">
                        {site.hostname}
                      </span>
                      <span className="mt-1.5 block text-sm leading-snug text-ash-light">
                        {site.blurb}
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.div>
      </div>
    </div>
  );
}

/** The new-tab backdrop: a faint grid under a soft pool of light. */
function Ambient({ tone }: { readonly tone: 'verdigris' | 'amber' }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const glow =
    tone === 'amber'
      ? 'bg-[radial-gradient(closest-side,rgba(216,162,74,0.22),transparent)]'
      : 'bg-[radial-gradient(closest-side,rgba(62,142,126,0.32),transparent)]';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid mask-radial absolute inset-0 opacity-70" />
      {/* Positioned by the wrapper: Framer's inline transform would erase a translate class. */}
      <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[52rem] -translate-x-1/2">
        <motion.div
          key={tone}
          className={`h-full w-full rounded-full blur-2xl ${glow}`}
          initial={{ opacity: 0 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: [0.75, 1, 0.75], scale: [1, 1.06, 1] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0.6 }
              : { duration: 9, ease: 'easeInOut', repeat: Infinity }
          }
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}

/* ── Terminal views ─────────────────────────────────────────────────────── */

/** Shared frame for the interstitial, refusal and error cards. */
function StateCard({
  tone,
  icon,
  eyebrow,
  children,
}: {
  readonly tone: 'amber' | 'neutral';
  readonly icon: ReactNode;
  readonly eyebrow: ReactNode;
  readonly children: ReactNode;
}) {
  const isAmber = tone === 'amber';
  return (
    <div className="relative h-full overflow-hidden bg-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="bg-grid mask-radial absolute inset-0 opacity-40" />
        <div
          className={`absolute left-1/2 top-[-12rem] h-[30rem] w-[44rem] -translate-x-1/2 rounded-full blur-2xl ${
            isAmber
              ? 'bg-[radial-gradient(closest-side,rgba(216,162,74,0.2),transparent)]'
              : 'bg-[radial-gradient(closest-side,rgba(138,143,152,0.14),transparent)]'
          }`}
        />
      </div>

      <div className="log-scroll relative h-full overflow-y-auto">
        <div className="flex min-h-full items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: ENTER_EASE }}
            className={`glass relative w-full max-w-xl overflow-hidden rounded-2xl p-6 sm:p-8 ${
              isAmber ? 'border-amber/25' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                isAmber ? 'via-amber-glow/70' : 'via-white/25'
              }`}
            />
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.08 }}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${
                  isAmber
                    ? 'bg-amber/10 text-amber-glow ring-amber/30 shadow-glow-amber'
                    : 'bg-white/[0.05] text-parchment ring-white/10 shadow-lift'
                }`}
              >
                {icon}
              </motion.span>
              <div className={`eyebrow flex items-center gap-1.5 ${isAmber ? 'text-amber' : ''}`}>
                {eyebrow}
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** The requested URL, set apart; a plain-http scheme is called out in amber. */
function UrlBlock({ href }: { readonly href: string }) {
  const isHttp = href.startsWith('http://');
  return (
    <p className="technical mt-5 break-all rounded-lg border border-white/[0.06] bg-black/40 px-3.5 py-2.5 text-sm text-ash-light">
      {isHttp ? (
        <>
          <span className="text-amber">http://</span>
          {href.slice('http://'.length)}
        </>
      ) : (
        href
      )}
    </p>
  );
}

function InsecureInterstitial({
  href,
  onNavigate,
}: {
  readonly href: string;
  readonly onNavigate: NavigateFn;
}) {
  const hostname = safeHostname(href);

  return (
    <StateCard
      tone="amber"
      icon={<UnlockIcon className="h-6 w-6" />}
      eyebrow={
        <>
          <ShieldIcon className="h-3.5 w-3.5" />
          Connection is not encrypted
        </>
      }
    >
      <h1 className="mt-6 break-words font-display text-3xl text-parchment">
        {hostname} was requested over http
      </h1>

      <p className="mt-3 text-base leading-relaxed text-ash-light">
        MiniTor did not load this page. Over plain http, anyone between you and this site — your
        network, your internet provider — can read and change what is sent, including anything you
        type into it.
      </p>

      <UrlBlock href={href} />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate(upgradeToHttps(href))} className="btn-primary">
          Try https instead
        </button>
        <button
          type="button"
          onClick={() => onNavigate(href, { allowInsecure: true })}
          className="btn-secondary hover:border-amber/40 hover:text-amber-glow"
        >
          Load it anyway, unencrypted
        </button>
      </div>

      <p className="mt-5 border-t border-white/[0.06] pt-4 text-sm text-ash">
        Most sites redirect http to https on their own. If “try https” works, use that.
      </p>
    </StateCard>
  );
}

function NotEmbeddable({
  href,
  onNavigate,
}: {
  readonly href: string;
  readonly onNavigate: NavigateFn;
}) {
  const hostname = safeHostname(href);
  // If the refusal came from a search, the useful recovery is that same query
  // on an engine that does frame — not "go back and retype it".
  const query = queryFromSearchUrl(href);

  return (
    <StateCard
      tone="neutral"
      icon={<LayersIcon className="h-6 w-6" />}
      eyebrow="Framing refused"
    >
      <h1 className="mt-6 break-words font-display text-3xl text-parchment">
        {query ? `${hostname} cannot show search results here` : `${hostname} refuses to be embedded`}
      </h1>

      <p className="mt-3 text-base leading-relaxed text-ash-light">
        This is not a MiniTor error. {hostname} sends a header —{' '}
        <code className="technical whitespace-nowrap rounded-sm bg-white/[0.06] px-1 py-px text-sm text-parchment">
          X-Frame-Options: DENY
        </code>{' '}
        or a{' '}
        <code className="technical whitespace-nowrap rounded-sm bg-white/[0.06] px-1 py-px text-sm text-parchment">
          Content-Security-Policy
        </code>{' '}
        that restricts{' '}
        <code className="technical whitespace-nowrap rounded-sm bg-white/[0.06] px-1 py-px text-sm text-parchment">
          frame-ancestors
        </code>{' '}
        — telling your browser not to display it inside another page.
      </p>

      <p className="mt-3 text-base leading-relaxed text-ash-light">
        Sites do this to prevent clickjacking, where an attacker frames a real login page under an
        invisible overlay. Your browser enforces it before any of MiniTor’s code runs, so the
        refusal cannot be worked around from here — a real browser extension or a native app would
        be needed.
      </p>

      <UrlBlock href={href} />

      {query ? (
        <div className="mt-6 rounded-xl border border-verdigris-bright/20 bg-verdigris/[0.08] px-4 py-4">
          <p className="font-body text-sm font-medium text-parchment">
            Search “{query}” on an engine that works here
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EMBEDDABLE_ENGINES.map((engine) => (
              <button
                key={engine.id}
                type="button"
                onClick={() => onNavigate(searchUrl(query, engine.id))}
                className="inline-flex items-center gap-1.5 rounded-full border border-verdigris-bright/30 bg-verdigris/10 px-3.5 py-1.5 font-body text-sm text-verdigris-glow transition-all duration-200 hover:border-verdigris-bright/60 hover:bg-verdigris/20 active:scale-[0.98]"
              >
                <SearchIcon className="h-3.5 w-3.5" />
                {engine.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={query ? 'btn-secondary' : 'btn-primary'}
        >
          Open in a real browser tab
          <ArrowUpRightIcon className="h-4 w-4" />
        </a>
        <button type="button" onClick={() => onNavigate('/')} className="btn-secondary">
          Back to the start page
        </button>
      </div>
    </StateCard>
  );
}

function ErrorState({
  message,
  onNavigate,
}: {
  readonly message: string;
  readonly onNavigate: NavigateFn;
}) {
  return (
    <StateCard
      tone="neutral"
      icon={<WarnIcon className="h-6 w-6 text-amber" />}
      eyebrow="Navigation failed"
    >
      <h1 className="mt-6 font-display text-3xl text-parchment">That did not work</h1>
      <p className="mt-3 text-base leading-relaxed text-ash-light">{message}</p>
      <div className="mt-6">
        <button type="button" onClick={() => onNavigate('/')} className="btn-secondary">
          Back to the start page
        </button>
      </div>
    </StateCard>
  );
}

function safeHostname(href: string): string {
  try {
    return new URL(href, 'https://minitor.local').hostname;
  } catch {
    return href;
  }
}

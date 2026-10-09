'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import {
  CARD,
  CATEGORY_COLOR,
  CardHeader,
  EASE_OUT,
  Meter,
  SPRING,
} from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { LayersIcon, SearchIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { RequestRecord, ScanTotals } from '@/lib/scan/types';

export type RequestFilter = 'all' | 'blocked' | 'trackers' | 'ads' | 'third-party' | 'http';

const FILTERS: readonly { id: RequestFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'trackers', label: 'Trackers' },
  { id: 'ads', label: 'Ads' },
  { id: 'third-party', label: 'Third-party' },
  { id: 'http', label: 'HTTP' },
];

const TRACKING_CATEGORIES = new Set(['analytics', 'advertising', 'social', 'fingerprinting']);

/** Filtering lives here as a pure predicate so it is easy to reason about. */
function matchesFilter(request: RequestRecord, filter: RequestFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'blocked':
      return request.action === 'block';
    case 'trackers':
      return TRACKING_CATEGORIES.has(request.category);
    case 'ads':
      return request.category === 'advertising';
    case 'third-party':
      return !request.firstParty;
    case 'http':
      return !request.secure;
    default:
      return true;
  }
}

/** Long URLs are truncated in the middle so the host and path both stay legible. */
function truncateUrl(url: string, max = 64): string {
  if (url.length <= max) return url;
  const head = url.slice(0, max - 24);
  const tail = url.slice(-20);
  return `${head}…${tail}`;
}

/**
 * Headline request numbers. Total and the allowed/blocked split lead, drawn as
 * one bar so the proportion is visible before any number is read; the domain
 * counts follow as a compact grid.
 */
export function RequestOverview({ totals }: { readonly totals: ScanTotals }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const total = Math.max(1, totals.totalRequests);
  const allowedShare = (totals.allowedRequests / total) * 100;
  const blockedShare = (totals.blockedRequests / total) * 100;

  const secondary: readonly { label: string; value: number }[] = [
    { label: 'Tracker domains', value: totals.trackersDetected },
    { label: 'Advertising domains', value: totals.advertisingDomains },
    { label: 'Third-party domains', value: totals.thirdPartyDomains },
    { label: 'Cookies', value: totals.cookieCount },
  ];

  return (
    <section className={CARD}>
      <dl className="flex items-end gap-4">
        <div className="mr-auto">
          <dt className="eyebrow">Total requests</dt>
          <dd className="mt-1.5 font-display text-5xl leading-none text-white">
            <AnimatedNumber value={totals.totalRequests} />
          </dd>
        </div>
        <div className="pb-1 text-right">
          <dt className="flex items-center justify-end gap-1.5 text-xs text-ash">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-verdigris-bright" />
            Allowed
          </dt>
          <dd className="technical tabular mt-0.5 text-lg text-parchment">
            <AnimatedNumber value={totals.allowedRequests} />
          </dd>
        </div>
        <div className="pb-1 text-right">
          <dt className="flex items-center justify-end gap-1.5 text-xs text-ash">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
            Blocked
          </dt>
          <dd className="technical tabular mt-0.5 text-lg text-amber">
            <AnimatedNumber value={totals.blockedRequests} />
          </dd>
        </div>
      </dl>

      {/* Allowed | blocked as one bar, separated by a 2px gap. */}
      <div aria-hidden="true" className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundImage: 'linear-gradient(90deg, #2F6D60, #5BC2AA)' }}
          initial={prefersReducedMotion ? false : { width: '0%' }}
          animate={{ width: `${allowedShare}%` }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
        />
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundImage: 'linear-gradient(90deg, #D8A24A, #F5C46B)',
            boxShadow: '0 0 10px rgba(245, 196, 107, 0.45)',
          }}
          initial={prefersReducedMotion ? false : { width: '0%' }}
          animate={{ width: `${blockedShare}%` }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.25 }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.05]">
        {secondary.map((stat) => (
          <div key={stat.label} className="bg-ink-raised px-3 py-2.5">
            <dt className="text-xs leading-tight text-ash">{stat.label}</dt>
            <dd className="technical tabular mt-1 text-base text-parchment">
              <AnimatedNumber value={stat.value} />
            </dd>
          </div>
        ))}
        <div className="col-span-2 bg-ink-raised px-3 py-2.5">
          <dt className="text-xs leading-tight text-ash">Over HTTPS</dt>
          <dd className="mt-1 flex items-center gap-3">
            <span
              className={`technical tabular shrink-0 text-base ${totals.httpsShare === 100 ? 'text-verdigris-bright' : 'text-parchment'}`}
            >
              <AnimatedNumber value={totals.httpsShare} />%
            </span>
            <Meter value={totals.httpsShare} from="#2F6D60" to="#8AF0D6" delay={0.3} className="h-1 flex-1" />
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function RequestTable({
  requests,
  onSelectDomain,
}: {
  readonly requests: readonly RequestRecord[];
  readonly onSelectDomain: (domain: string) => void;
}) {
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [query, setQuery] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (!matchesFilter(request, filter)) return false;
      if (!needle) return true;
      return (
        request.domain.toLowerCase().includes(needle) || request.url.toLowerCase().includes(needle)
      );
    });
  }, [requests, filter, query]);

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<RequestFilter, number>>(
        (acc, entry) => {
          acc[entry.id] = requests.filter((request) => matchesFilter(request, entry.id)).length;
          return acc;
        },
        { all: 0, blocked: 0, trackers: 0, ads: 0, 'third-party': 0, http: 0 },
      ),
    [requests],
  );

  return (
    <section className="surface relative overflow-hidden">
      <header className="border-b border-white/[0.06] p-4">
        <CardHeader
          icon={<LayersIcon className="h-3.5 w-3.5" />}
          title="Network activity"
          description="Every request observed in this scan, and what MiniTor’s rules did with it."
        />

        <div className="mt-3.5 flex flex-wrap gap-1">
          {FILTERS.map((entry) => {
            const isActive = filter === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={isActive}
                className={`relative rounded-full px-2.5 py-1 font-mono text-xs transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-ash hover:bg-white/[0.04] hover:text-parchment'
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="request-filter-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full border border-verdigris-bright/30 bg-verdigris-bright/[0.12]"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px -6px rgba(91,194,170,0.7)' }}
                  />
                ) : null}
                <span className="relative">
                  {entry.label}{' '}
                  <span className={`tabular ${isActive ? 'text-verdigris-glow' : 'text-ash-dim'}`}>
                    {counts[entry.id]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/25 px-3.5 py-2 transition-all duration-200 focus-within:border-verdigris-bright/50 focus-within:shadow-[0_0_0_4px_rgba(91,194,170,0.12)] hover:border-white/[0.14]">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-ash" />
          <label htmlFor="request-search" className="sr-only">
            Search requests by domain or URL
          </label>
          <input
            id="request-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search domain or URL"
            className="min-w-0 flex-1 bg-transparent font-body text-xs text-parchment placeholder:text-ash-dim focus:outline-none"
          />
          <span className="technical tabular shrink-0 text-xs text-ash-dim">{visible.length}</span>
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-ash"
          >
            <SearchIcon className="h-4 w-4" />
          </span>
          <p className="mt-3 text-xs text-ash">
            No requests match this filter{query.trim() ? ' and search' : ''}.
          </p>
        </div>
      ) : (
        <div className="log-scroll max-h-96 overflow-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-[1] bg-ink-raised/95 backdrop-blur-md">
              <tr>
                {/* Fixed widths sized to the longest value each column shows
                    ("Third-party", "advertising", the BLOCK chip); the domain
                    column takes what is left and truncates. */}
                {[
                  { heading: 'Domain', width: 'pl-4 pr-2' },
                  { heading: 'Type', width: 'w-[86px] px-1.5 max-sm:w-[74px] max-sm:px-1' },
                  { heading: 'Source', width: 'w-[88px] px-1.5 max-sm:w-[82px] max-sm:px-1' },
                  { heading: 'Action', width: 'w-[66px] pl-1.5 pr-3 max-sm:w-[60px] max-sm:pl-1 max-sm:pr-2' },
                ].map(({ heading, width }) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`border-b border-white/[0.06] py-2 font-mono text-xs font-normal uppercase tracking-[0.1em] text-ash-dim ${width}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((request, index) => (
                <motion.tr
                  key={request.id}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index, 14) * 0.018 }}
                  className="group border-b border-white/[0.04] transition-colors duration-150 last:border-b-0 hover:bg-white/[0.03]"
                >
                  <td className="overflow-hidden py-2 pl-4 pr-2">
                    <button
                      type="button"
                      onClick={() => onSelectDomain(request.domain)}
                      className="flex w-full min-w-0 items-start gap-2 rounded-sm text-left"
                      title={request.url}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLOR[request.category] }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="technical block truncate text-xs text-parchment transition-colors duration-150 group-hover:text-white">
                          {request.domain}
                        </span>
                        <span className="technical block truncate text-xs text-ash-dim">
                          {truncateUrl(request.url)}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="overflow-hidden px-1.5 py-2 max-sm:px-1">
                    <span className="block truncate font-mono text-xs text-ash-light">{request.resourceType}</span>
                    <span className="block truncate font-mono text-xs text-ash-dim">{request.category}</span>
                  </td>
                  <td className="overflow-hidden px-1.5 py-2 max-sm:px-1">
                    <span className="block truncate font-mono text-xs text-ash-light">
                      {request.firstParty ? 'First-party' : 'Third-party'}
                    </span>
                    <span
                      className={`block font-mono text-xs ${request.secure ? 'text-ash-dim' : 'text-amber'}`}
                    >
                      {request.secure ? 'https' : 'http'}
                    </span>
                  </td>
                  <td className="py-2 pl-1.5 pr-3 max-sm:pl-1 max-sm:pr-2">
                    <span
                      className={`chip px-1.5 ${
                        request.action === 'block'
                          ? 'border-amber/30 bg-amber/10 text-amber'
                          : 'border-verdigris-bright/20 bg-verdigris-bright/[0.07] text-verdigris-bright'
                      }`}
                    >
                      {request.action === 'block' ? 'BLOCK' : 'ALLOW'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

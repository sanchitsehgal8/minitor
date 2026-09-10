'use client';

import { useMemo, useState } from 'react';

import { SearchIcon } from '@/components/ui/icons';
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

export function RequestOverview({ totals }: { readonly totals: ScanTotals }) {
  const stats: readonly { label: string; value: string }[] = [
    { label: 'Total requests', value: String(totals.totalRequests) },
    { label: 'Allowed', value: String(totals.allowedRequests) },
    { label: 'Blocked', value: String(totals.blockedRequests) },
    { label: 'Tracker domains', value: String(totals.trackersDetected) },
    { label: 'Advertising domains', value: String(totals.advertisingDomains) },
    { label: 'Third-party domains', value: String(totals.thirdPartyDomains) },
    { label: 'Cookies', value: String(totals.cookieCount) },
    { label: 'Over HTTPS', value: `${totals.httpsShare}%` },
  ];

  return (
    <dl className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-md border border-ink-edge bg-ink px-3 py-2.5">
          <dt className="text-xs leading-tight text-ash-dim">{stat.label}</dt>
          <dd className="technical mt-0.5 text-lg text-parchment">{stat.value}</dd>
        </div>
      ))}
    </dl>
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
    <section className="rounded-lg border border-ink-edge bg-ink-raised">
      <header className="border-b border-ink-edge p-4">
        <h3 className="font-body text-sm font-medium text-parchment">Network activity</h3>
        <p className="mt-1 text-xs text-ash">
          Every request observed in this scan, and what MiniTor’s rules did with it.
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              aria-pressed={filter === entry.id}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors duration-150 ${
                filter === entry.id
                  ? 'border-verdigris bg-verdigris-dim/25 text-verdigris'
                  : 'border-ink-edge text-ash hover:border-ash-dim hover:text-parchment'
              }`}
            >
              {entry.label} {counts[entry.id]}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-md border border-ink-edge bg-ink px-2.5 py-1.5 focus-within:border-verdigris">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-ash-dim" />
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
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ash-dim">
          No requests match this filter{query.trim() ? ' and search' : ''}.
        </p>
      ) : (
        <div className="log-scroll max-h-96 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-ink-sunken">
              <tr>
                {['Domain', 'Type', 'Source', 'Action'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="border-b border-ink-edge px-3 py-2 font-mono text-xs font-normal text-ash-dim"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <tr key={request.id} className="border-b border-ink-edge/60 hover:bg-ink">
                  <td className="max-w-[220px] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectDomain(request.domain)}
                      className="block w-full truncate text-left"
                      title={request.url}
                    >
                      <span className="technical block truncate text-xs text-parchment">
                        {request.domain}
                      </span>
                      <span className="technical block truncate text-xs text-ash-dim">
                        {truncateUrl(request.url)}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-ash-light">{request.resourceType}</span>
                    <span className="block font-mono text-xs text-ash-dim">{request.category}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-ash-light">
                      {request.firstParty ? 'First-party' : 'Third-party'}
                    </span>
                    <span
                      className={`block font-mono text-xs ${request.secure ? 'text-ash-dim' : 'text-amber'}`}
                    >
                      {request.secure ? 'https' : 'http'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 font-mono text-xs ${
                        request.action === 'block'
                          ? 'bg-amber-dim/20 text-amber'
                          : 'bg-verdigris-dim/20 text-verdigris'
                      }`}
                    >
                      {request.action === 'block' ? 'BLOCK' : 'ALLOW'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

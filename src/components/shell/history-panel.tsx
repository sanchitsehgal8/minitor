'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { ClockIcon, SearchIcon, TrashIcon } from '@/components/ui/icons';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SearchField,
  SiteMark,
  formatRelativeTime,
} from '@/components/ui/panel-states';
import { useHistory } from '@/hooks/use-history';
import { formatForDisplay } from '@/lib/privacy/url';

export function HistoryPanel({
  isActive,
  onNavigate,
}: {
  readonly isActive: boolean;
  readonly onNavigate: (url: string) => void;
}) {
  const { entries, total, query, setQuery, isLoading, error, refresh, remove, clearAll } =
    useHistory(isActive);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-3 pb-3 pt-3">
        <SearchField id="history-search" label="Search history" value={query} onChange={setQuery} />

        <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
          <span className="technical tabular text-xs text-ash">{total} entries</span>
          {total > 0 ? (
            <button
              type="button"
              onClick={() => void clearAll()}
              className="rounded-full px-2.5 py-1 font-mono text-xs text-ash transition-colors duration-200 hover:bg-amber/10 hover:text-amber"
            >
              Clear all history
            </button>
          ) : null}
        </div>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

        {isLoading && entries.length === 0 ? <LoadingState label="Loading history…" /> : null}

        {!isLoading && total === 0 ? (
          <EmptyState icon={<ClockIcon className="h-5 w-5" />}>
            No history yet. Pages you open in ordinary tabs appear here; private tabs never do.
          </EmptyState>
        ) : null}

        {!isLoading && total > 0 && entries.length === 0 ? (
          <EmptyState icon={<SearchIcon className="h-5 w-5" />}>
            Nothing in your history matches “{query.trim()}”.
          </EmptyState>
        ) : null}

        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.02 } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-white/[0.04]"
              >
                <SiteMark url={entry.url} label={entry.title} />

                <button
                  type="button"
                  onClick={() => onNavigate(entry.url)}
                  className="min-w-0 flex-1 rounded-md text-left"
                >
                  <span className="block truncate font-body text-sm text-parchment">
                    {entry.title}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="technical truncate text-ash">{formatForDisplay(entry.url)}</span>
                    <span aria-hidden="true" className="text-ash-dim">
                      ·
                    </span>
                    <time
                      dateTime={entry.visitedAt}
                      title={new Date(entry.visitedAt).toLocaleString('en-GB')}
                      className="technical shrink-0 text-ash"
                    >
                      {formatRelativeTime(entry.visitedAt)}
                    </time>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void remove(entry.id)}
                  aria-label={`Delete ${entry.title} from history`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ash opacity-0 transition-all duration-200 hover:bg-amber/10 hover:text-amber focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

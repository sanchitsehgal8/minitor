'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { SearchIcon, TrashIcon } from '@/components/ui/icons';
import { ErrorState } from '@/components/ui/panel-states';
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
      <div className="border-b border-ink-edge px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-ink-edge bg-ink-raised px-2.5 py-1.5 focus-within:border-verdigris">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-ash-dim" />
          <label htmlFor="history-search" className="sr-only">
            Search history
          </label>
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search history"
            className="min-w-0 flex-1 bg-transparent font-body text-sm text-parchment placeholder:text-ash-dim focus:outline-none"
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="technical text-xs text-ash-dim">{total} entries</span>
          {total > 0 ? (
            <button
              type="button"
              onClick={() => void clearAll()}
              className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-ash transition-colors duration-150 hover:text-amber"
            >
              Clear all history
            </button>
          ) : null}
        </div>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : null}

        {isLoading && entries.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ash-dim">Loading…</p>
        ) : null}

        {!isLoading && total === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-ash-dim">
            No history yet. Pages you open in ordinary tabs appear here; private tabs never do.
          </p>
        ) : null}

        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="group flex items-start gap-1 rounded-md px-2 py-1.5 hover:bg-ink-raised"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(entry.url)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-body text-sm text-parchment">
                    {entry.title}
                  </span>
                  <span className="technical block truncate text-xs text-ash-dim">
                    {formatForDisplay(entry.url)}
                  </span>
                  <span className="technical block text-xs text-ash-dim">
                    {new Date(entry.visitedAt).toLocaleString('en-GB')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void remove(entry.id)}
                  aria-label={`Delete ${entry.title} from history`}
                  className="mt-0.5 shrink-0 rounded-sm p-1 text-ash-dim opacity-0 transition-opacity duration-150 hover:text-amber focus-visible:opacity-100 group-hover:opacity-100"
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

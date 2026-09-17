'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { SearchIcon, TrashIcon } from '@/components/ui/icons';
import { ErrorState } from '@/components/ui/panel-states';
import type { useBookmarks } from '@/hooks/use-bookmarks';
import { formatForDisplay } from '@/lib/privacy/url';

/**
 * Takes the bookmarks store as a prop rather than calling the hook itself: the
 * shell needs the same store to drive the address bar's star, and two hook
 * instances would mean two caches that disagree.
 */
export function BookmarksPanel({
  store,
  onNavigate,
}: {
  readonly store: ReturnType<typeof useBookmarks>;
  readonly onNavigate: (url: string) => void;
}) {
  const { bookmarks, total, query, setQuery, isLoading, error, remove, rename } = store;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  function beginRename(id: string, title: string) {
    setEditingId(id);
    setDraftTitle(title);
  }

  async function commitRename(id: string) {
    const next = draftTitle.trim();
    setEditingId(null);
    if (next.length > 0) await rename(id, next);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-edge px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-ink-edge bg-ink-raised px-2.5 py-1.5 focus-within:border-verdigris">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-ash-dim" />
          <label htmlFor="bookmark-search" className="sr-only">
            Search bookmarks
          </label>
          <input
            id="bookmark-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bookmarks"
            className="min-w-0 flex-1 bg-transparent font-body text-sm text-parchment placeholder:text-ash-dim focus:outline-none"
          />
        </div>
        <p className="technical mt-2 text-xs text-ash-dim">{total} saved</p>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <ErrorState message={error} onRetry={() => void store.refresh()} />
        ) : null}

        {isLoading && bookmarks.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ash-dim">Loading…</p>
        ) : null}

        {!isLoading && total === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-ash-dim">
            Nothing saved yet. Use the star in the address bar to bookmark the page you are on.
          </p>
        ) : null}

        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {bookmarks.map((bookmark) => (
              <motion.li
                key={bookmark.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="group flex items-start gap-1 rounded-md px-2 py-1.5 hover:bg-ink-raised"
              >
                {editingId === bookmark.id ? (
                  <form
                    className="flex-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void commitRename(bookmark.id);
                    }}
                  >
                    <label htmlFor={`rename-${bookmark.id}`} className="sr-only">
                      Bookmark name
                    </label>
                    <input
                      id={`rename-${bookmark.id}`}
                      autoFocus
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onBlur={() => void commitRename(bookmark.id)}
                      className="w-full rounded-sm border border-verdigris bg-ink px-1.5 py-1 font-body text-sm text-parchment focus:outline-none"
                    />
                    <button type="submit" className="sr-only">
                      Save name
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(bookmark.url)}
                    onDoubleClick={() => beginRename(bookmark.id, bookmark.title)}
                    className="min-w-0 flex-1 text-left"
                    title="Click to open, double-click to rename"
                  >
                    <span className="block truncate font-body text-sm text-parchment">
                      {bookmark.title}
                    </span>
                    <span className="technical block truncate text-xs text-ash-dim">
                      {formatForDisplay(bookmark.url)}
                    </span>
                  </button>
                )}

                <div className="mt-0.5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => beginRename(bookmark.id, bookmark.title)}
                    aria-label={`Rename ${bookmark.title}`}
                    className="rounded-sm px-1 py-0.5 font-mono text-xs text-ash-dim hover:text-parchment"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(bookmark.id)}
                    aria-label={`Delete bookmark ${bookmark.title}`}
                    className="rounded-sm p-1 text-ash-dim hover:text-amber"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

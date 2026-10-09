'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { SearchIcon, StarIcon, TrashIcon } from '@/components/ui/icons';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SearchField,
  SiteMark,
} from '@/components/ui/panel-states';
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
      <div className="border-b border-white/[0.06] px-3 pb-3 pt-3">
        <SearchField id="bookmark-search" label="Search bookmarks" value={query} onChange={setQuery} />
        <p className="technical tabular mt-2.5 px-1 text-xs text-ash">{total} saved</p>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {error ? <ErrorState message={error} onRetry={() => void store.refresh()} /> : null}

        {isLoading && bookmarks.length === 0 ? <LoadingState label="Loading bookmarks…" /> : null}

        {!isLoading && total === 0 ? (
          <EmptyState icon={<StarIcon className="h-5 w-5" />}>
            Nothing saved yet. Use the star in the address bar to bookmark the page you are on.
          </EmptyState>
        ) : null}

        {!isLoading && total > 0 && bookmarks.length === 0 ? (
          <EmptyState icon={<SearchIcon className="h-5 w-5" />}>
            No bookmarks match “{query.trim()}”.
          </EmptyState>
        ) : null}

        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {bookmarks.map((bookmark, index) => (
              <motion.li
                key={bookmark.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.02 } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-white/[0.04]"
              >
                <SiteMark url={bookmark.url} label={bookmark.title} />

                {editingId === bookmark.id ? (
                  <form
                    className="min-w-0 flex-1"
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
                      className="w-full rounded-md border border-verdigris-bright/60 bg-black/40 px-2.5 py-1.5 font-body text-sm text-parchment shadow-[0_0_0_3px_rgba(91,194,170,0.12)] focus:outline-none"
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
                    className="min-w-0 flex-1 rounded-md text-left"
                    title="Click to open, double-click to rename"
                  >
                    <span className="block truncate font-body text-sm text-parchment">
                      {bookmark.title}
                    </span>
                    <span className="technical mt-0.5 block truncate text-xs text-ash">
                      {formatForDisplay(bookmark.url)}
                    </span>
                  </button>
                )}

                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <button
                    type="button"
                    onClick={() => beginRename(bookmark.id, bookmark.title)}
                    aria-label={`Rename ${bookmark.title}`}
                    className="rounded-full px-2 py-1 font-mono text-xs text-ash transition-colors duration-200 hover:bg-white/[0.07] hover:text-parchment"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(bookmark.id)}
                    aria-label={`Delete bookmark ${bookmark.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ash transition-colors duration-200 hover:bg-amber/10 hover:text-amber"
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

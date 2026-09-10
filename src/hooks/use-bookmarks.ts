'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError, type BookmarkDto } from '@/lib/client/api-client';

export function useBookmarks(enabled: boolean) {
  const [bookmarks, setBookmarks] = useState<readonly BookmarkDto[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { bookmarks: fetched } = await api.listBookmarks();
      setBookmarks(fetched);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load bookmarks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const save = useCallback(
    async (url: string, title: string, isPrivate: boolean) => {
      if (isPrivate) return { saved: false as const };
      try {
        const result = await api.saveBookmark(url, title, isPrivate);
        if (result.bookmark) {
          const saved = result.bookmark;
          setBookmarks((rows) => [saved, ...rows.filter((row) => row.url !== saved.url)]);
        }
        return { saved: result.saved };
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : 'Could not save that bookmark.');
        return { saved: false as const };
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      const snapshot = bookmarks;
      setBookmarks((rows) => rows.filter((row) => row.id !== id));
      try {
        await api.deleteBookmark(id);
      } catch (cause) {
        setBookmarks(snapshot);
        setError(cause instanceof ApiError ? cause.message : 'Could not delete that bookmark.');
      }
    },
    [bookmarks],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      const snapshot = bookmarks;
      setBookmarks((rows) => rows.map((row) => (row.id === id ? { ...row, title } : row)));
      try {
        await api.renameBookmark(id, title);
      } catch (cause) {
        setBookmarks(snapshot);
        setError(cause instanceof ApiError ? cause.message : 'Could not rename that bookmark.');
      }
    },
    [bookmarks],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bookmarks;
    return bookmarks.filter(
      (row) => row.title.toLowerCase().includes(needle) || row.url.toLowerCase().includes(needle),
    );
  }, [bookmarks, query]);

  const bookmarkedUrls = useMemo(() => new Set(bookmarks.map((row) => row.url)), [bookmarks]);

  return {
    bookmarks: visible,
    total: bookmarks.length,
    bookmarkedUrls,
    query,
    setQuery,
    isLoading,
    error,
    refresh,
    save,
    remove,
    rename,
  };
}

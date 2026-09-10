'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError, type HistoryEntryDto } from '@/lib/client/api-client';

/**
 * History panel state. Optimistic on delete (the row leaves immediately and is
 * restored if the server refuses) because deletion is the one action where
 * waiting on a round-trip feels broken.
 */
export function useHistory(enabled: boolean) {
  const [entries, setEntries] = useState<readonly HistoryEntryDto[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { entries: fetched } = await api.listHistory();
      setEntries(fetched);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const remove = useCallback(
    async (id: string) => {
      const snapshot = entries;
      setEntries((rows) => rows.filter((row) => row.id !== id));
      try {
        await api.deleteHistoryEntry(id);
      } catch (cause) {
        setEntries(snapshot);
        setError(cause instanceof ApiError ? cause.message : 'Could not delete that entry.');
      }
    },
    [entries],
  );

  const clearAll = useCallback(async () => {
    const snapshot = entries;
    setEntries([]);
    try {
      await api.clearHistory();
    } catch (cause) {
      setEntries(snapshot);
      setError(cause instanceof ApiError ? cause.message : 'Could not clear history.');
    }
  }, [entries]);

  /** Filtering client-side keeps typing instant; the server also supports `q`. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  return { entries: visible, total: entries.length, query, setQuery, isLoading, error, refresh, remove, clearAll };
}

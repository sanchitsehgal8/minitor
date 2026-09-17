'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError, type HistoryEntryDto } from '@/lib/client/api-client';
import { useIsMounted, useLatestRequest } from '@/hooks/use-latest-request';

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

  const beginRequest = useLatestRequest();
  const isMounted = useIsMounted();

  const refresh = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    setError(null);
    try {
      const { entries: fetched } = await api.listHistory();
      if (!isCurrent()) return;
      setEntries(fetched);
    } catch (cause) {
      if (!isCurrent()) return;
      setError(cause instanceof ApiError ? cause.message : 'Could not load history.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  // Snapshots are taken inside the updater, not from the render closure, so a
  // concurrent refresh landing mid-flight cannot make the rollback restore a
  // stale list.
  const remove = useCallback(
    async (id: string) => {
      let snapshot: readonly HistoryEntryDto[] = [];
      setEntries((rows) => {
        snapshot = rows;
        return rows.filter((row) => row.id !== id);
      });
      try {
        await api.deleteHistoryEntry(id);
      } catch (cause) {
        if (!isMounted()) return;
        setEntries(snapshot);
        setError(cause instanceof ApiError ? cause.message : 'Could not delete that entry.');
      }
    },
    [isMounted],
  );

  const clearAll = useCallback(async () => {
    let snapshot: readonly HistoryEntryDto[] = [];
    setEntries((rows) => {
      snapshot = rows;
      return [];
    });
    try {
      await api.clearHistory();
    } catch (cause) {
      if (!isMounted()) return;
      setEntries(snapshot);
      setError(cause instanceof ApiError ? cause.message : 'Could not clear history.');
    }
  }, [isMounted]);

  /** Filtering client-side keeps typing instant; the server also supports `q`. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  return {
    entries: visible,
    total: entries.length,
    query,
    setQuery,
    isLoading,
    error,
    refresh,
    remove,
    clearAll,
  };
}

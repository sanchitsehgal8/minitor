'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api, ApiError, type StoredScan } from '@/lib/client/api-client';
import { SCAN_STAGES } from '@/lib/scan/scan-stages';
import { domainFromInput } from '@/lib/scan/scan-engine';

export type ScanPhase =
  | { readonly kind: 'idle' }
  /** Walking the stage list while the request is in flight. */
  | { readonly kind: 'scanning'; readonly stageIndex: number; readonly target: string }
  | { readonly kind: 'done'; readonly scan: StoredScan; readonly stored: boolean }
  | { readonly kind: 'error'; readonly message: string };

/**
 * Owns the scan lifecycle: stage animation, the API call, and scan history.
 *
 * The staged progress is presentational — the report is already computed
 * server-side by the time the stages finish. They are shown because a scan that
 * returns instantly reads as fake, and because each stage names a real step the
 * engine performs. The UI never fabricates the numbers themselves.
 */
export function useScans(isPrivate: boolean) {
  const [phase, setPhase] = useState<ScanPhase>({ kind: 'idle' });
  const [history, setHistory] = useState<readonly StoredScan[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Cleared on unmount so a stage timer cannot fire into a dead component.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const refreshHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const { scans } = await api.listScans();
      setHistory(scans);
    } catch (cause) {
      setHistoryError(cause instanceof ApiError ? cause.message : 'Could not load your scans.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const startScan = useCallback(
    async (input: string) => {
      const target = domainFromInput(input);
      if (!target) {
        setPhase({
          kind: 'error',
          message: `“${input.trim()}” is not a URL or hostname MiniTor can analyse.`,
        });
        return;
      }

      clearTimers();
      setPhase({ kind: 'scanning', stageIndex: 0, target });

      // Advance the visible stage on a schedule while the request runs.
      let elapsed = 0;
      SCAN_STAGES.forEach((stage, index) => {
        elapsed += stage.durationMs;
        timers.current.push(
          setTimeout(() => {
            setPhase((current) =>
              current.kind === 'scanning'
                ? { ...current, stageIndex: Math.min(index + 1, SCAN_STAGES.length - 1) }
                : current,
            );
          }, elapsed),
        );
      });

      const totalMs = SCAN_STAGES.reduce((sum, stage) => sum + stage.durationMs, 0);
      const startedAt = Date.now();

      try {
        const result = await api.scanWebsite(input, isPrivate);

        // Let the stages finish even if the server answered sooner, so the
        // progress UI never truncates mid-way.
        const remaining = Math.max(0, totalMs - (Date.now() - startedAt));
        timers.current.push(
          setTimeout(() => {
            setPhase({ kind: 'done', scan: result.scan, stored: result.stored });
            if (result.stored) void refreshHistory();
          }, remaining),
        );
      } catch (cause) {
        clearTimers();
        setPhase({
          kind: 'error',
          message: cause instanceof ApiError ? cause.message : 'That scan could not be completed.',
        });
      }
    },
    [isPrivate, clearTimers, refreshHistory],
  );

  const reset = useCallback(() => {
    clearTimers();
    setPhase({ kind: 'idle' });
  }, [clearTimers]);

  /** Opens a stored scan without re-running it (spec §13). */
  const openStoredScan = useCallback((scan: StoredScan) => {
    clearTimers();
    setPhase({ kind: 'done', scan, stored: true });
  }, [clearTimers]);

  const toggleMonitoring = useCallback(
    async (id: string, monitored: boolean) => {
      const snapshot = history;
      setHistory((rows) => rows.map((row) => (row.id === id ? { ...row, monitored } : row)));
      setPhase((current) =>
        current.kind === 'done' && current.scan.id === id
          ? { ...current, scan: { ...current.scan, monitored } }
          : current,
      );
      try {
        await api.setScanMonitoring(id, monitored);
      } catch (cause) {
        setHistory(snapshot);
        setHistoryError(
          cause instanceof ApiError ? cause.message : 'Could not change monitoring for that site.',
        );
      }
    },
    [history],
  );

  const removeScan = useCallback(
    async (id: string) => {
      const snapshot = history;
      setHistory((rows) => rows.filter((row) => row.id !== id));
      try {
        await api.deleteScan(id);
      } catch (cause) {
        setHistory(snapshot);
        setHistoryError(cause instanceof ApiError ? cause.message : 'Could not delete that scan.');
      }
    },
    [history],
  );

  /** Most recent scan per domain, for the history list and comparison pickers. */
  const latestByDomain = useMemo(() => {
    const seen = new Map<string, StoredScan>();
    for (const scan of history) {
      if (!seen.has(scan.domain)) seen.set(scan.domain, scan);
    }
    return [...seen.values()];
  }, [history]);

  const monitored = useMemo(() => latestByDomain.filter((scan) => scan.monitored), [latestByDomain]);

  /** Aggregate figures for the dashboard (spec §16). */
  const aggregates = useMemo(() => {
    if (history.length === 0) {
      return { scanCount: 0, requestsAnalysed: 0, trackersBlocked: 0, thirdPartyDomains: 0, averagePrivacy: 0 };
    }
    const requestsAnalysed = history.reduce((sum, scan) => sum + scan.totals.totalRequests, 0);
    const trackersBlocked = history.reduce((sum, scan) => sum + scan.totals.trackersBlocked, 0);
    const thirdPartyDomains = history.reduce((sum, scan) => sum + scan.totals.thirdPartyDomains, 0);
    const averagePrivacy = Math.round(
      history.reduce((sum, scan) => sum + scan.privacy.total, 0) / history.length,
    );
    return {
      scanCount: history.length,
      requestsAnalysed,
      trackersBlocked,
      thirdPartyDomains,
      averagePrivacy,
    };
  }, [history]);

  return {
    phase,
    history,
    latestByDomain,
    monitored,
    aggregates,
    isLoadingHistory,
    historyError,
    startScan,
    reset,
    openStoredScan,
    toggleMonitoring,
    removeScan,
    refreshHistory,
  };
}

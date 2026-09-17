'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Guards async state updates in a hook that can have several requests in flight.
 *
 * Two problems it solves, both of which were live in the list hooks:
 *
 * 1. **Out-of-order responses.** Opening a panel, closing it and reopening it
 *    fires overlapping GETs. Whichever resolves last won, which is not
 *    necessarily the newest — so the list could settle on stale data.
 * 2. **Writes after unmount.** The side panels unmount on every tab switch, so
 *    a resolution arriving afterwards updated a dead component.
 *
 * `begin()` claims a slot and returns a predicate: call it after every `await`
 * and bail out when it is false. Deliberately not an `AbortController` — these
 * are idempotent GETs where the response is cheap and cancelling mid-flight
 * would still leave the ordering problem unsolved.
 */
export function useLatestRequest(): () => () => boolean {
  const token = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => {
    const claimed = (token.current += 1);
    return () => mounted.current && claimed === token.current;
  }, []);
}

/** Mount tracker for hooks that only need the unmount half of the guard. */
export function useIsMounted(): () => boolean {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
}

'use client';

import { useCallback, useMemo, useReducer, useState } from 'react';

import { api } from '@/lib/client/api-client';
import {
  activeTab as selectActiveTab,
  browserReducer,
  canGoBack,
  canGoForward,
  createInitialState,
  current,
  type TabView,
} from '@/lib/browser/tabs';
import { isKnownEmbeddable } from '@/lib/privacy/embeddable-sites';
import { enforcementForPage, eventsForPageLoad, type PrivacyEvent } from '@/lib/privacy/privacy-console';
import { DEFAULT_ENGINE_ID } from '@/lib/privacy/search';
import { parseAddressBarInput } from '@/lib/privacy/url';

const MAX_LOG_EVENTS = 120;

/**
 * The navigation controller: the one path through which any page is opened.
 *
 * Centralising it is what makes the guarantees checkable — every navigation
 * runs the same scheme check, the same embeddability check, and the same
 * private-mode branch, so no call site can skip one.
 */
export function useBrowser(isPrivate: boolean, searchEngineId: string = DEFAULT_ENGINE_ID) {
  const [state, dispatch] = useReducer(browserReducer, undefined, createInitialState);
  /**
   * Privacy-console events, keyed by tab.
   *
   * A single shared list was wrong on both counts that matter here: the console
   * says "requests on this page", and its disclosure header says whether they
   * were really blocked or only simulated. With one list, switching tabs kept
   * the other tab's events on screen underneath the new tab's disclosure — so
   * the honesty label could describe events it did not belong to.
   */
  const [eventsByTab, setEventsByTab] = useState<Readonly<Record<string, readonly PrivacyEvent[]>>>(
    {},
  );

  const tab = selectActiveTab(state);

  const logPageLoad = useCallback((tabId: string, href: string) => {
    const fresh = eventsForPageLoad(href);
    setEventsByTab((existing) => ({
      ...existing,
      [tabId]: [...fresh].reverse().concat(existing[tabId] ?? []).slice(0, MAX_LOG_EVENTS),
    }));
  }, []);

  /**
   * Records the visit. Private tabs do not call the API at all, and the API
   * would refuse the write even if they did (spec §5) — two independent
   * barriers, so a regression in one is not a leak.
   */
  const recordVisit = useCallback(
    async (href: string, title: string, tabIsPrivate: boolean) => {
      if (tabIsPrivate) return;
      try {
        await api.recordVisit(href, title, false);
      } catch {
        // History is a convenience; a failed write must not interrupt browsing.
      }
    },
    [],
  );

  const navigate = useCallback(
    (input: string, options?: { readonly allowInsecure?: boolean }) => {
      const tabId = state.activeTabId;
      const target = selectActiveTab(state);

      // Submitting an empty address bar is a no-op, as in a real browser.
      // Treating it as a failed navigation replaced the loaded page with a
      // full-screen error and left no way back to it.
      if (input.trim().length === 0) return;

      // Start page: an explicit reset, not a URL.
      if (input === '/') {
        dispatch({ type: 'set-view', id: tabId, view: { kind: 'start' }, recordHistory: false });
        return;
      }

      // App-relative demo pages bypass URL parsing: they are ours, always
      // https in production, and always embeddable.
      if (input.startsWith('/')) {
        commit(input);
        return;
      }

      /**
       * The http opt-in is an explicit argument, not a magic `#fragment`
       * appended to the URL. As a sentinel it was both forgeable — typing the
       * fragment skipped the interstitial entirely — and lossy, since a real
       * URL could legitimately end with it.
       */
      const allowInsecure = options?.allowInsecure ?? false;

      const parsed = parseAddressBarInput(input, searchEngineId);
      if (!parsed.ok) {
        dispatch({
          type: 'set-view',
          id: tabId,
          view: { kind: 'error', message: parsed.reason },
          recordHistory: false,
        });
        return;
      }

      const { href, isSecure } = parsed.target;

      // HTTPS-only enforcement (objective 5): http stops here unless the user
      // has explicitly accepted the risk on the interstitial.
      if (!isSecure && !allowInsecure) {
        dispatch({
          type: 'set-view',
          id: tabId,
          view: { kind: 'insecure-interstitial', href },
          recordHistory: false,
        });
        return;
      }

      if (!isKnownEmbeddable(href)) {
        dispatch({
          type: 'set-view',
          id: tabId,
          view: { kind: 'not-embeddable', href },
          recordHistory: false,
        });
        return;
      }

      commit(href);

      function commit(committed: string) {
        const view: TabView = { kind: 'page', href: committed };
        dispatch({ type: 'set-view', id: tabId, view, recordHistory: true });
        logPageLoad(tabId, committed);
        void recordVisit(committed, titleFromHref(committed), target.isPrivate);
      }
    },
    [state, logPageLoad, recordVisit, searchEngineId],
  );

  const openTab = useCallback(() => dispatch({ type: 'open-tab', isPrivate }), [isPrivate]);
  const closeTab = useCallback((id: string) => dispatch({ type: 'close-tab', id }), []);
  const activateTab = useCallback((id: string) => dispatch({ type: 'activate-tab', id }), []);

  const goBack = useCallback(() => {
    dispatch({ type: 'go-back', id: state.activeTabId });
  }, [state.activeTabId]);

  const goForward = useCallback(() => {
    dispatch({ type: 'go-forward', id: state.activeTabId });
  }, [state.activeTabId]);

  const reload = useCallback(() => {
    const href = current(tab.stack);
    dispatch({ type: 'reload', id: tab.id });
    if (href) logPageLoad(tab.id, href);
  }, [tab.id, tab.stack, logPageLoad]);

  /** Clears only the active tab's log — other tabs keep their own. */
  const clearLog = useCallback(() => {
    setEventsByTab((existing) => ({ ...existing, [state.activeTabId]: [] }));
  }, [state.activeTabId]);

  const events = useMemo(
    () => eventsByTab[state.activeTabId] ?? [],
    [eventsByTab, state.activeTabId],
  );

  /**
   * The committed page for iframe/bookmark purposes: only a real page counts.
   * An interstitial has not loaded anything, so it must not be bookmarkable.
   */
  const currentHref = tab.view.kind === 'page' ? tab.view.href : (current(tab.stack) ?? '');

  /**
   * What the address bar shows. Terminal views (an http warning, a framing
   * refusal) still display the URL the user asked for — blanking the bar there
   * would lose the address they typed just as they are deciding what to do
   * about it.
   */
  const displayHref =
    tab.view.kind === 'insecure-interstitial' || tab.view.kind === 'not-embeddable'
      ? tab.view.href
      : currentHref;

  const isEnforcedPage = useMemo(
    () => (currentHref ? enforcementForPage(currentHref) === 'blocked' : false),
    [currentHref],
  );

  const setTabPrivacy = useCallback(
    (id: string, nextIsPrivate: boolean) => dispatch({ type: 'set-privacy', id, isPrivate: nextIsPrivate }),
    [],
  );

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    tab,
    currentHref,
    displayHref,
    setTabPrivacy,
    events,
    isEnforcedPage,
    canGoBack: canGoBack(tab.stack),
    canGoForward: canGoForward(tab.stack),
    navigate,
    openTab,
    closeTab,
    activateTab,
    goBack,
    goForward,
    reload,
    clearLog,
  };
}

/** Best-effort title before the page reports one: hostname + last path segment. */
function titleFromHref(href: string): string {
  try {
    const url = new URL(href, 'https://minitor.local');
    const last = url.pathname.split('/').filter(Boolean).pop();
    const readable = last ? decodeURIComponent(last).replace(/_/g, ' ') : '';
    return readable ? `${readable} — ${url.hostname}` : url.hostname;
  } catch {
    return href;
  }
}

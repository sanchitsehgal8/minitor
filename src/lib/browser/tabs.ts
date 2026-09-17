/**
 * Tab model and reducer.
 *
 * All tab state transitions live here as a pure reducer so the shell component
 * stays presentational, and so the invariants that matter — at least one tab
 * always open, private tabs never recording history — are enforced in one
 * place that can be tested directly.
 */

import {
  back,
  canGoBack,
  canGoForward,
  createStack,
  current,
  forward,
  push,
  type NavigationStack,
} from './navigation-stack';

/** What the viewport should render for a tab. */
export type TabView =
  /** Nothing loaded yet — show the curated start page. */
  | { readonly kind: 'start' }
  /** Loading or loaded in the iframe. */
  | { readonly kind: 'page'; readonly href: string }
  /** http:// URL awaiting explicit user consent (spec §6). */
  | { readonly kind: 'insecure-interstitial'; readonly href: string }
  /** Not on the curated allowlist — explain X-Frame-Options. */
  | { readonly kind: 'not-embeddable'; readonly href: string }
  /** Malformed input or unsupported scheme. */
  | { readonly kind: 'error'; readonly message: string };

export type Tab = {
  readonly id: string;
  readonly title: string;
  readonly stack: NavigationStack;
  readonly view: TabView;
  /**
   * Private tabs write nothing to history or bookmarks, ever. Set at creation
   * and switchable via `set-privacy`, so the toggle applies to the tab you are
   * looking at rather than only to the next one you open.
   */
  readonly isPrivate: boolean;
  /** Bumped to force an iframe remount on reload. */
  readonly reloadToken: number;
};

export type BrowserState = {
  readonly tabs: readonly Tab[];
  readonly activeTabId: string;
};

export const NEW_TAB_TITLE = 'New tab';

let tabCounter = 0;

function nextTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now().toString(36)}-${tabCounter}`;
}

export function createTab(isPrivate: boolean): Tab {
  return {
    id: nextTabId(),
    title: NEW_TAB_TITLE,
    stack: createStack(),
    view: { kind: 'start' },
    isPrivate,
    reloadToken: 0,
  };
}

export function createInitialState(): BrowserState {
  const tab = createTab(false);
  return { tabs: [tab], activeTabId: tab.id };
}

export function activeTab(state: BrowserState): Tab {
  const found = state.tabs.find((tab) => tab.id === state.activeTabId);
  // A tab is always present by invariant; fall back rather than throw so a
  // corrupted id can never blank the whole shell.
  return found ?? state.tabs[0] ?? createTab(false);
}

/**
 * The single navigation entry point's signature.
 *
 * `allowInsecure` is the user's explicit consent from the HTTPS interstitial.
 * It is an argument rather than a sentinel appended to the URL so that consent
 * cannot be forged by typing a magic fragment into the address bar.
 */
export type NavigateFn = (input: string, options?: { readonly allowInsecure?: boolean }) => void;

export type BrowserAction =
  | { readonly type: 'open-tab'; readonly isPrivate: boolean }
  | { readonly type: 'close-tab'; readonly id: string }
  | { readonly type: 'activate-tab'; readonly id: string }
  | { readonly type: 'set-view'; readonly id: string; readonly view: TabView; readonly recordHistory: boolean }
  | { readonly type: 'set-title'; readonly id: string; readonly title: string }
  | { readonly type: 'go-back'; readonly id: string }
  | { readonly type: 'go-forward'; readonly id: string }
  | { readonly type: 'reload'; readonly id: string }
  | { readonly type: 'set-privacy'; readonly id: string; readonly isPrivate: boolean };

function mapTab(state: BrowserState, id: string, fn: (tab: Tab) => Tab): BrowserState {
  return { ...state, tabs: state.tabs.map((tab) => (tab.id === id ? fn(tab) : tab)) };
}

/** Title shown on a tab: the page's own title if known, else the host. */
function titleFor(view: TabView, fallback: string): string {
  if (view.kind === 'page' || view.kind === 'not-embeddable' || view.kind === 'insecure-interstitial') {
    try {
      return new URL(view.href, 'https://minitor.local').hostname;
    } catch {
      return fallback;
    }
  }
  if (view.kind === 'start') return NEW_TAB_TITLE;
  return fallback;
}

export function browserReducer(state: BrowserState, action: BrowserAction): BrowserState {
  switch (action.type) {
    case 'open-tab': {
      const tab = createTab(action.isPrivate);
      return { tabs: [...state.tabs, tab], activeTabId: tab.id };
    }

    case 'close-tab': {
      // Resolve the target BEFORE the last-tab branch. Checking `length === 1`
      // first would let a stale id — a double-click on a close button, or a
      // click that lands after the tab already closed — replace whichever tab
      // happened to be open, silently discarding its navigation stack.
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      if (index === -1) return state;

      // Invariant: at least one tab stays open (spec §6). The replacement
      // inherits the closed tab's mode, so closing the last private tab does
      // not drop the user into a normal one.
      if (state.tabs.length === 1) {
        const replacement = createTab(state.tabs[0]!.isPrivate);
        return { tabs: [replacement], activeTabId: replacement.id };
      }
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      const activeTabId =
        state.activeTabId === action.id
          ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? tabs[0]!.id)
          : state.activeTabId;
      return { tabs, activeTabId };
    }

    case 'activate-tab':
      return state.tabs.some((tab) => tab.id === action.id)
        ? { ...state, activeTabId: action.id }
        : state;

    case 'set-view':
      return mapTab(state, action.id, (tab) => {
        // Only a committed page load extends the nav stack. Interstitials and
        // errors are terminal views, not history entries — going "back" from
        // one should return to the last real page.
        const stack =
          action.recordHistory && action.view.kind === 'page'
            ? push(tab.stack, action.view.href)
            : tab.stack;
        return { ...tab, view: action.view, stack, title: titleFor(action.view, tab.title) };
      });

    case 'set-title':
      return mapTab(state, action.id, (tab) =>
        action.title.trim().length > 0 ? { ...tab, title: action.title.trim() } : tab,
      );

    case 'go-back':
      return mapTab(state, action.id, (tab) => {
        if (!canGoBack(tab.stack)) return tab;
        const stack = back(tab.stack);
        const href = current(stack);
        return href
          ? { ...tab, stack, view: { kind: 'page', href }, title: titleFor({ kind: 'page', href }, tab.title) }
          : tab;
      });

    case 'go-forward':
      return mapTab(state, action.id, (tab) => {
        if (!canGoForward(tab.stack)) return tab;
        const stack = forward(tab.stack);
        const href = current(stack);
        return href
          ? { ...tab, stack, view: { kind: 'page', href }, title: titleFor({ kind: 'page', href }, tab.title) }
          : tab;
      });

    case 'reload':
      return mapTab(state, action.id, (tab) => ({ ...tab, reloadToken: tab.reloadToken + 1 }));

    /**
     * Turning private mode on converts the tab you are looking at, so the
     * banner's promise applies to what is actually on screen. Turning it off
     * cannot un-record the past — it only affects visits from here on, which is
     * the same guarantee a real browser gives.
     */
    case 'set-privacy':
      return mapTab(state, action.id, (tab) => ({ ...tab, isPrivate: action.isPrivate }));

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export { canGoBack, canGoForward, current };

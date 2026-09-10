import { describe, expect, it } from 'vitest';

import {
  activeTab,
  browserReducer,
  createInitialState,
  NEW_TAB_TITLE,
  type BrowserState,
} from '@/lib/browser/tabs';

function reduce(state: BrowserState, ...actions: Parameters<typeof browserReducer>[1][]): BrowserState {
  return actions.reduce(browserReducer, state);
}

describe('browser reducer', () => {
  it('starts with exactly one non-private tab', () => {
    const state = createInitialState();
    expect(state.tabs).toHaveLength(1);
    expect(activeTab(state).isPrivate).toBe(false);
    expect(activeTab(state).title).toBe(NEW_TAB_TITLE);
  });

  it('keeps at least one tab open when the last one is closed', () => {
    const state = createInitialState();
    const next = browserReducer(state, { type: 'close-tab', id: state.activeTabId });
    expect(next.tabs).toHaveLength(1);
    expect(next.tabs[0]!.id).not.toBe(state.activeTabId);
  });

  it('activates a neighbour when the active tab is closed', () => {
    let state = createInitialState();
    state = reduce(state, { type: 'open-tab', isPrivate: false }, { type: 'open-tab', isPrivate: false });
    const middleId = state.tabs[1]!.id;
    state = browserReducer(state, { type: 'activate-tab', id: middleId });
    state = browserReducer(state, { type: 'close-tab', id: middleId });

    expect(state.tabs).toHaveLength(2);
    expect(state.tabs.some((tab) => tab.id === middleId)).toBe(false);
    expect(state.tabs.some((tab) => tab.id === state.activeTabId)).toBe(true);
  });

  it('records a committed page load in the tab history stack', () => {
    const state = createInitialState();
    const next = browserReducer(state, {
      type: 'set-view',
      id: state.activeTabId,
      view: { kind: 'page', href: 'https://example.com/' },
      recordHistory: true,
    });
    expect(activeTab(next).stack.entries).toEqual(['https://example.com/']);
  });

  it('does not put an interstitial or error into the history stack', () => {
    const state = createInitialState();
    const next = reduce(
      state,
      {
        type: 'set-view',
        id: state.activeTabId,
        view: { kind: 'insecure-interstitial', href: 'http://example.com/' },
        recordHistory: true,
      },
      {
        type: 'set-view',
        id: state.activeTabId,
        view: { kind: 'error', message: 'nope' },
        recordHistory: true,
      },
    );
    expect(activeTab(next).stack.entries).toEqual([]);
  });

  it('inherits private mode onto tabs opened while it is on', () => {
    const state = browserReducer(createInitialState(), { type: 'open-tab', isPrivate: true });
    expect(activeTab(state).isPrivate).toBe(true);
  });

  it('bumps the reload token so the frame remounts', () => {
    const state = createInitialState();
    const next = browserReducer(state, { type: 'reload', id: state.activeTabId });
    expect(activeTab(next).reloadToken).toBe(activeTab(state).reloadToken + 1);
  });

  it('derives the tab title from the hostname of the loaded page', () => {
    const state = createInitialState();
    const next = browserReducer(state, {
      type: 'set-view',
      id: state.activeTabId,
      view: { kind: 'page', href: 'https://en.wikipedia.org/wiki/Tor' },
      recordHistory: true,
    });
    expect(activeTab(next).title).toBe('en.wikipedia.org');
  });

  it('converts the tab in view when private mode is switched on', () => {
    const state = createInitialState();
    const on = browserReducer(state, { type: 'set-privacy', id: state.activeTabId, isPrivate: true });
    expect(activeTab(on).isPrivate).toBe(true);

    const off = browserReducer(on, { type: 'set-privacy', id: state.activeTabId, isPrivate: false });
    expect(activeTab(off).isPrivate).toBe(false);
  });

  it('keeps a converted tab’s history stack intact', () => {
    let state = createInitialState();
    state = browserReducer(state, {
      type: 'set-view',
      id: state.activeTabId,
      view: { kind: 'page', href: 'https://example.com/' },
      recordHistory: true,
    });
    state = browserReducer(state, { type: 'set-privacy', id: state.activeTabId, isPrivate: true });
    expect(activeTab(state).stack.entries).toEqual(['https://example.com/']);
  });

  it('ignores actions aimed at an unknown tab', () => {
    const state = createInitialState();
    expect(browserReducer(state, { type: 'activate-tab', id: 'missing' })).toBe(state);
  });
});

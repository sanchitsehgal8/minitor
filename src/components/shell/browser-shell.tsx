'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { AddressBar } from '@/components/shell/address-bar';
import { BookmarksPanel } from '@/components/shell/bookmarks-panel';
import { CookiesPanel } from '@/components/shell/cookies-panel';
import { HistoryPanel } from '@/components/shell/history-panel';
import { PrivacyConsole } from '@/components/shell/privacy-console';
import { PrivateModeBanner } from '@/components/shell/private-mode-banner';
import { PrivacyCenter } from '@/components/privacy/privacy-center';
import { PanelTabs, panelBodyId, panelTabId, type PanelId } from '@/components/shell/side-panel';
import { TabBar } from '@/components/shell/tab-bar';
import { Viewport } from '@/components/shell/viewport';
import { MaskIcon, ShieldIcon } from '@/components/ui/icons';
import { TabPanel } from '@/components/ui/tablist';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useBrowser } from '@/hooks/use-browser';
import { domainFromInput } from '@/lib/scan/scan-engine';

export function BrowserShell({ userEmail }: { readonly userEmail: string }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [panel, setPanel] = useState<PanelId>('analysis');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const browser = useBrowser(isPrivate);
  // One bookmarks store shared by the panel and the address bar's star, so the
  // filled/empty state can never disagree with the list.
  const bookmarks = useBookmarks(true);

  const { currentHref, displayHref, tab } = browser;
  const isBookmarked = currentHref.length > 0 && bookmarks.bookmarkedUrls.has(currentHref);

  const toggleBookmark = useCallback(async () => {
    if (currentHref.length === 0 || tab.isPrivate) return;
    const existing = bookmarks.bookmarks.find((row) => row.url === currentHref);
    if (existing) {
      await bookmarks.remove(existing.id);
      return;
    }
    await bookmarks.save(currentHref, tab.title, tab.isPrivate);
  }, [currentHref, tab.isPrivate, tab.title, bookmarks]);

  // Reflects the URL on display: an http interstitial must show the amber
  // unlocked padlock, not a reassuring green one.
  const isSecure = displayHref.startsWith('https://') || displayHref.startsWith('/');

  // The active tab's domain, so Privacy Center can offer to analyse it directly.
  const currentDomain = useMemo(
    () => (currentHref && !currentHref.startsWith('/') ? (domainFromInput(currentHref) ?? '') : ''),
    [currentHref],
  );

  return (
    <div
      className={`on-ink flex h-screen flex-col overflow-hidden transition-colors duration-300 ${
        isPrivate ? 'bg-ink-sunken' : 'bg-ink'
      }`}
    >
      {/* Private mode tints the chrome toward ink + amber (spec §6). */}
      <div className={isPrivate ? 'border-b-2 border-amber' : 'border-b-2 border-transparent'}>
        <header className="flex items-center justify-between gap-3 px-3 py-2">
          <Link href="/" className="shrink-0 font-display text-base text-parchment">
            MiniTor
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !isPrivate;
                setIsPrivate(next);
                // Convert the tab in view too, so the banner's guarantee
                // describes what is actually on screen.
                browser.setTabPrivacy(browser.activeTabId, next);
              }}
              aria-pressed={isPrivate}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-body text-xs transition-colors duration-150 ${
                isPrivate
                  ? 'border-amber bg-amber-dim/20 text-amber'
                  : 'border-ink-edge text-ash-light hover:border-ash-dim hover:text-parchment'
              }`}
            >
              <MaskIcon className="h-3.5 w-3.5" />
              Private mode {isPrivate ? 'on' : 'off'}
            </button>

            <button
              type="button"
              onClick={() => {
                setPanel('analysis');
                setIsPanelOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-md border border-verdigris-dim bg-verdigris-dim/15 px-2.5 py-1 font-body text-xs text-verdigris transition-colors duration-150 hover:bg-verdigris-dim/25"
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Privacy</span>
              <span className="sm:sr-only">Open Privacy Center</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPanelOpen((value) => !value)}
              aria-pressed={isPanelOpen}
              className="hidden rounded-md border border-ink-edge px-2.5 py-1 font-body text-xs text-ash-light transition-colors duration-150 hover:border-ash-dim hover:text-parchment lg:block"
            >
              {isPanelOpen ? 'Hide panel' : 'Show panel'}
            </button>

            <span className="hidden max-w-[180px] truncate font-mono text-xs text-ash-dim sm:block">
              {userEmail}
            </span>

            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/' })}
              className="rounded-md border border-ink-edge px-2.5 py-1 font-body text-xs text-ash-light transition-colors duration-150 hover:border-ash-dim hover:text-parchment"
            >
              Log out
            </button>
          </div>
        </header>

        {/*
          Keyed off the tab actually on screen, not the toolbar toggle. The
          banner promises "nothing here is written to your history"; showing it
          while a non-private tab is in view would make that promise false for
          the page the user is looking at.
        */}
        {tab.isPrivate ? <PrivateModeBanner /> : null}
      </div>

      <TabBar
        tabs={browser.tabs}
        activeTabId={browser.activeTabId}
        isPrivate={isPrivate}
        onActivate={browser.activateTab}
        onClose={browser.closeTab}
        onOpen={browser.openTab}
      />

      <AddressBar
        value={displayHref}
        isSecure={isSecure}
        canGoBack={browser.canGoBack}
        canGoForward={browser.canGoForward}
        isBookmarked={isBookmarked}
        isPrivate={tab.isPrivate}
        onNavigate={browser.navigate}
        onBack={browser.goBack}
        onForward={browser.goForward}
        onReload={browser.reload}
        onToggleBookmark={() => void toggleBookmark()}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-hidden border-t border-ink-edge lg:border-r">
          <Viewport
            view={tab.view}
            reloadToken={tab.reloadToken}
            isPrivate={tab.isPrivate}
            onNavigate={browser.navigate}
          />
        </main>

        {isPanelOpen ? (
          <aside className="flex h-80 min-h-0 shrink-0 flex-col border-t border-ink-edge lg:h-auto lg:w-[26rem] lg:border-t-0">
            <PanelTabs active={panel} onSelect={setPanel} />
            <div className="min-h-0 flex-1 overflow-hidden bg-ink-sunken">
              {/*
                Privacy Center stays mounted and is hidden instead of unmounted.
                It owns the scan lifecycle, so unmounting it discarded an
                in-progress scan and the open report on any stray panel click —
                three seconds of work lost to a misclick. The other panels hold
                only re-fetchable list state, so they unmount as before.
              */}
              <TabPanel
                id={panelBodyId('analysis')}
                labelledBy={panelTabId('analysis')}
                className={panel === 'analysis' ? 'h-full' : 'hidden'}
              >
                <PrivacyCenter currentDomain={currentDomain} isPrivate={tab.isPrivate} />
              </TabPanel>
              {panel === 'privacy' ? (
                <TabPanel id={panelBodyId('privacy')} labelledBy={panelTabId('privacy')} className="h-full">
                  <PrivacyConsole
                    events={browser.events}
                    isEnforcedPage={browser.isEnforcedPage}
                    onClear={browser.clearLog}
                  />
                </TabPanel>
              ) : null}
              {panel === 'history' ? (
                <TabPanel id={panelBodyId('history')} labelledBy={panelTabId('history')} className="h-full">
                  <HistoryPanel isActive onNavigate={browser.navigate} />
                </TabPanel>
              ) : null}
              {panel === 'bookmarks' ? (
                <TabPanel id={panelBodyId('bookmarks')} labelledBy={panelTabId('bookmarks')} className="h-full">
                  <BookmarksPanel store={bookmarks} onNavigate={browser.navigate} />
                </TabPanel>
              ) : null}
              {panel === 'cookies' ? (
                <TabPanel id={panelBodyId('cookies')} labelledBy={panelTabId('cookies')} className="h-full">
                  <CookiesPanel isActive />
                </TabPanel>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

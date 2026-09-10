'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { AddressBar } from '@/components/shell/address-bar';
import { BookmarksPanel } from '@/components/shell/bookmarks-panel';
import { CookiesPanel } from '@/components/shell/cookies-panel';
import { HistoryPanel } from '@/components/shell/history-panel';
import { PrivacyConsole } from '@/components/shell/privacy-console';
import { PrivateModeBanner } from '@/components/shell/private-mode-banner';
import { PanelTabs, type PanelId } from '@/components/shell/side-panel';
import { TabBar } from '@/components/shell/tab-bar';
import { Viewport } from '@/components/shell/viewport';
import { MaskIcon } from '@/components/ui/icons';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useBrowser } from '@/hooks/use-browser';

export function BrowserShell({ userEmail }: { readonly userEmail: string }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [panel, setPanel] = useState<PanelId>('privacy');
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

        {isPrivate ? <PrivateModeBanner /> : null}
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
          <aside className="flex h-80 min-h-0 shrink-0 flex-col border-t border-ink-edge lg:h-auto lg:w-80 lg:border-t-0">
            <PanelTabs active={panel} onSelect={setPanel} />
            <div className="min-h-0 flex-1 overflow-hidden bg-ink-sunken">
              {panel === 'privacy' ? (
                <PrivacyConsole
                  events={browser.events}
                  isEnforcedPage={browser.isEnforcedPage}
                  onClear={browser.clearLog}
                />
              ) : null}
              {panel === 'history' ? (
                <HistoryPanel isActive onNavigate={browser.navigate} />
              ) : null}
              {panel === 'bookmarks' ? (
                <BookmarksPanel store={bookmarks} onNavigate={browser.navigate} />
              ) : null}
              {panel === 'cookies' ? <CookiesPanel isActive /> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

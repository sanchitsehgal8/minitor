'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
import { LogOutIcon, MaskIcon, PanelIcon, ShieldIcon } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/logo';
import { TabPanel } from '@/components/ui/tablist';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useBrowser } from '@/hooks/use-browser';
import { domainFromInput } from '@/lib/scan/scan-engine';

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;
const UI_EASE = [0.32, 0.72, 0, 1] as const;

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

  const initial = userEmail.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="on-ink relative isolate flex h-[100dvh] flex-col overflow-hidden bg-void">
      {/*
        Private mode tints the chrome toward ink + amber (spec §6): a lit amber
        edge along the top and a warm wash behind the toolbar. Both are keyed
        off the toolbar toggle, so the whole window reads as "private" the
        moment it is switched on.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56">
        <div className="absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(62,142,126,0.10),transparent_70%)]" />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(216,162,74,0.16),transparent_70%)]"
          initial={false}
          animate={{ opacity: isPrivate ? 1 : 0 }}
          transition={{ duration: 0.4, ease: UI_EASE }}
        />
      </div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-amber-glow to-transparent shadow-[0_0_12px_1px_rgba(245,196,107,0.55)]"
        initial={false}
        animate={{ scaleX: isPrivate ? 1 : 0, opacity: isPrivate ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      />

      <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-full pr-1 text-parchment"
        >
          <LogoMark className="h-6 w-6 transition-transform duration-500 ease-out group-hover:rotate-[20deg]" />
          <span className="font-display text-xl leading-none tracking-tight">MiniTor</span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
            className={`flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-1.5 font-body text-xs font-medium transition-colors duration-300 ${
              isPrivate
                ? 'border-amber/35 bg-amber/10 text-amber-glow shadow-glow-amber'
                : 'border-white/[0.08] bg-white/[0.03] text-ash-light hover:border-white/15 hover:text-parchment'
            }`}
          >
            <MaskIcon className="h-3.5 w-3.5" />
            <span>
              Private<span className="sr-only"> mode {isPrivate ? 'on' : 'off'}</span>
            </span>
            {/* The switch is drawn, not announced: aria-pressed carries the state. */}
            <span
              aria-hidden="true"
              className={`relative flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-300 ${
                isPrivate ? 'bg-amber/80' : 'bg-white/10'
              }`}
            >
              <motion.span
                className={`h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.5)] ${
                  isPrivate ? 'bg-white' : 'bg-ash-light'
                }`}
                initial={false}
                animate={{ x: isPrivate ? 16 : 0 }}
                transition={SPRING}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPanel('analysis');
              setIsPanelOpen(true);
            }}
            aria-label="Open Privacy Center"
            className="flex h-8 items-center gap-1.5 rounded-full border border-verdigris-bright/25 bg-verdigris/10 px-2.5 font-body text-xs font-medium text-verdigris-glow transition-all duration-300 hover:border-verdigris-bright/45 hover:bg-verdigris/20 hover:shadow-glow sm:px-3"
          >
            <ShieldIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPanelOpen((value) => !value)}
            aria-pressed={isPanelOpen}
            title={isPanelOpen ? 'Hide panel' : 'Show panel'}
            className={`chrome-button hidden lg:inline-flex ${isPanelOpen ? 'bg-white/[0.06] text-parchment' : ''}`}
          >
            <PanelIcon />
            <span className="sr-only">{isPanelOpen ? 'Hide panel' : 'Show panel'}</span>
          </button>

          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />

          <span
            className="hidden max-w-[13rem] items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] py-1 pl-1 pr-3 sm:flex"
            title={userEmail}
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-verdigris-glow to-verdigris-dim font-body text-xs font-semibold text-void"
            >
              {initial}
            </span>
            <span className="truncate font-mono text-xs text-ash-light">{userEmail}</span>
          </span>

          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: '/' })}
            aria-label="Log out"
            title="Log out"
            className="chrome-button"
          >
            <LogOutIcon />
          </button>
        </div>
      </header>

      {/*
        Keyed off the tab actually on screen, not the toolbar toggle. The
        banner promises "nothing here is written to your history"; showing it
        while a non-private tab is in view would make that promise false for
        the page the user is looking at.
      */}
      <AnimatePresence initial={false}>
        {tab.isPrivate ? <PrivateModeBanner key="private-banner" /> : null}
      </AnimatePresence>

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

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-1.5 pb-1.5 sm:gap-2 sm:px-2 sm:pb-2 lg:flex-row">
        {/* The content area is framed inside the chrome, the way a real browser insets the page. */}
        <main
          className={`relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-ink shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-colors duration-300 ${
            tab.isPrivate ? 'border-amber/20' : 'border-white/[0.07]'
          }`}
        >
          <Viewport
            view={tab.view}
            reloadToken={tab.reloadToken}
            isPrivate={tab.isPrivate}
            onNavigate={browser.navigate}
          />
        </main>

        <AnimatePresence initial={false}>
          {isPanelOpen ? (
            <motion.aside
              key="side-panel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: UI_EASE }}
              className="flex h-80 min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-ink lg:h-auto lg:w-[26rem]"
            >
              <PanelTabs active={panel} onSelect={setPanel} />
              <div className="min-h-0 flex-1 overflow-hidden">
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
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

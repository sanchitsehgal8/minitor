'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import { SiteMark } from '@/components/ui/panel-states';
import type { Tab } from '@/lib/browser/tabs';

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;
const UI_EASE = [0.32, 0.72, 0, 1] as const;

/** What the tab's mark is drawn from: the page in view, or nothing yet. */
function markSource(tab: Tab): string {
  const { view } = tab;
  if (view.kind === 'start') return '/';
  if (view.kind === 'error') return '';
  return view.href;
}

export function TabBar({
  tabs,
  activeTabId,
  isPrivate,
  onActivate,
  onClose,
  onOpen,
}: {
  readonly tabs: readonly Tab[];
  readonly activeTabId: string;
  readonly isPrivate: boolean;
  readonly onActivate: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onOpen: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const activeRef = useRef<HTMLLIElement | null>(null);

  // A newly opened tab lands at the end of the strip, which on a phone is
  // already off-screen at the third tab. Bring the active one into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeTabId, tabs.length, prefersReducedMotion]);

  return (
    /*
     * The strip scrolls; the new-tab button does not. Keeping "+" inside the
     * scroller pushed it off-screen as soon as the tabs overflowed — on a phone
     * that happens at two tabs, making the primary affordance unreachable.
     */
    <div className="flex items-center gap-1 px-2 pb-1.5 sm:px-3">
      {/*
        A list, not an ARIA tablist. Browser tabs are not `role="tab"` controls:
        each owns a close button, and the thing it switches is the whole
        viewport rather than a labelled tabpanel. Declaring a tablist put a
        non-tab child inside it (invalid) and promised arrow-key semantics the
        strip does not implement. `aria-current` states which tab is showing.
      */}
      <ul
        aria-label="Open tabs"
        className="no-scrollbar flex min-w-0 list-none items-center gap-1 overflow-x-auto py-0.5"
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.li
                key={tab.id}
                ref={isActive ? activeRef : undefined}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: UI_EASE }}
                className="group relative shrink-0"
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-tab"
                    transition={SPRING}
                    aria-hidden="true"
                    className={`absolute inset-0 rounded-lg border transition-colors duration-300 ${
                      tab.isPrivate
                        ? 'border-amber/25 bg-gradient-to-b from-amber/[0.14] to-amber/[0.05] shadow-[0_8px_24px_-12px_rgba(216,162,74,0.45)]'
                        : 'border-white/[0.09] bg-gradient-to-b from-white/[0.09] to-white/[0.04] shadow-lift'
                    }`}
                  />
                ) : null}

                <div className="relative flex w-full items-center overflow-hidden rounded-lg">
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onActivate(tab.id)}
                    className={`flex w-[9.5rem] items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-7 text-left font-body text-sm transition-colors duration-200 sm:w-[12.5rem] ${
                      isActive
                        ? 'text-parchment'
                        : 'text-ash hover:bg-white/[0.04] hover:text-ash-light'
                    }`}
                  >
                    <SiteMark url={markSource(tab)} label={tab.title} size="sm" isPrivate={tab.isPrivate} />
                    <span className="truncate">{tab.title}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onClose(tab.id)}
                    aria-label={`Close ${tab.title}`}
                    className={`absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-ash-light transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {/* Amber while private mode is on: the tab it opens will be private. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open a new tab"
        title={isPrivate ? 'New private tab' : 'New tab'}
        className={`group flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-90 ${
          isPrivate
            ? 'border-amber/25 bg-amber/10 text-amber hover:border-amber/40 hover:bg-amber/15 hover:text-amber-glow'
            : 'border-white/[0.06] bg-white/[0.03] text-ash-light hover:border-white/15 hover:bg-white/[0.08] hover:text-white'
        }`}
      >
        <PlusIcon className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-90" />
      </button>
    </div>
  );
}

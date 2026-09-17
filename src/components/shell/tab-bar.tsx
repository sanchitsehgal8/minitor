'use client';

import { motion } from 'framer-motion';

import { CloseIcon, MaskIcon, PlusIcon } from '@/components/ui/icons';
import type { Tab } from '@/lib/browser/tabs';

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
  return (
    /*
     * The strip scrolls; the new-tab button does not. Keeping "+" inside the
     * scroller pushed it off-screen as soon as the tabs overflowed — on a phone
     * that happens at two tabs, making the primary affordance unreachable.
     */
    <div className="flex items-end border-b border-ink-edge bg-ink-sunken pt-2">
      {/*
        A list, not an ARIA tablist. Browser tabs are not `role="tab"` controls:
        each owns a close button, and the thing it switches is the whole
        viewport rather than a labelled tabpanel. Declaring a tablist put a
        non-tab child inside it (invalid) and promised arrow-key semantics the
        strip does not implement. `aria-current` states which tab is showing.
      */}
      <ul
        aria-label="Open tabs"
        className="log-scroll flex min-w-0 flex-1 list-none items-end gap-1 overflow-x-auto px-2"
      >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <li key={tab.id} className="relative flex shrink-0 items-center">
            <button
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onActivate(tab.id)}
              className={`flex max-w-[200px] items-center gap-1.5 rounded-t-md px-3 py-2 font-mono text-xs transition-colors duration-150 ${
                isActive
                  ? 'bg-ink text-parchment'
                  : 'bg-transparent text-ash-dim hover:bg-ink-raised hover:text-ash-light'
              }`}
            >
              {tab.isPrivate ? (
                <MaskIcon className="h-3.5 w-3.5 shrink-0 text-amber" />
              ) : null}
              <span className="truncate">{tab.title}</span>
            </button>

            <button
              type="button"
              onClick={() => onClose(tab.id)}
              aria-label={`Close ${tab.title}`}
              className={`mr-1 flex h-5 w-5 items-center justify-center rounded-sm transition-colors duration-150 ${
                isActive ? 'text-ash-light hover:bg-ink-edge hover:text-white' : 'text-ash-dim hover:text-ash-light'
              }`}
            >
              <CloseIcon className="h-3 w-3" />
            </button>

            {isActive ? (
              <motion.span
                layoutId="active-tab-underline"
                className={`absolute inset-x-0 bottom-0 h-0.5 ${isPrivate ? 'bg-amber' : 'bg-verdigris'}`}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              />
            ) : null}
          </li>
        );
      })}

      </ul>

      <button
        type="button"
        onClick={onOpen}
        aria-label="Open a new tab"
        className="mb-1 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ash-light transition-colors duration-150 hover:bg-ink-edge hover:text-white"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

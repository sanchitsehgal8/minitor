'use client';

import { motion } from 'framer-motion';

import { ClockIcon, CookieIcon, ScanIcon, ShieldIcon, StarIcon } from '@/components/ui/icons';
import { useRovingTablist } from '@/components/ui/tablist';

export const PANELS = ['analysis', 'privacy', 'history', 'bookmarks', 'cookies'] as const;
export type PanelId = (typeof PANELS)[number];

/** Stable ids so each tab's `aria-controls` resolves to its panel. */
export const panelTabId = (panel: PanelId) => `panel-tab-${panel}`;
export const panelBodyId = (panel: PanelId) => `panel-body-${panel}`;

const LABELS: Record<PanelId, string> = {
  analysis: 'Analyse',
  privacy: 'Privacy',
  history: 'History',
  bookmarks: 'Bookmarks',
  cookies: 'Cookies',
};

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

/**
 * Segmented control. Only the selected segment shows its label: five labelled
 * segments do not fit a 26rem panel, let alone a phone, and icon-only for all
 * five made the active panel guesswork. The other labels stay in the
 * accessibility tree (sr-only), so every tab keeps its name.
 */
export function PanelTabs({
  active,
  onSelect,
}: {
  readonly active: PanelId;
  readonly onSelect: (panel: PanelId) => void;
}) {
  const activeIndex = PANELS.indexOf(active);
  const { tabProps } = useRovingTablist(PANELS.length, activeIndex, (index) => {
    const next = PANELS[index];
    if (next) onSelect(next);
  });

  return (
    <div className="border-b border-white/[0.06] px-2 py-2">
      <div
        role="tablist"
        aria-label="Side panels"
        className="relative flex rounded-full border border-white/[0.05] bg-black/30 p-1"
      >
        {PANELS.map((panel, index) => {
          const isActive = panel === active;
          return (
            <motion.button
              key={panel}
              type="button"
              {...tabProps(index, panelTabId(panel), panelBodyId(panel))}
              onClick={() => onSelect(panel)}
              title={LABELS[panel]}
              initial={false}
              animate={{ flexGrow: isActive ? 2.4 : 1 }}
              transition={SPRING}
              className={`relative flex min-w-0 basis-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-body text-xs font-medium transition-colors duration-200 ${
                isActive ? 'text-parchment' : 'text-ash hover:text-ash-light'
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="side-panel-pill"
                  transition={SPRING}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-white/[0.09] bg-gradient-to-b from-white/[0.1] to-white/[0.04] shadow-lift"
                />
              ) : null}
              <span className={`relative ${isActive ? 'text-verdigris-bright' : ''}`}>
                <TabGlyph panel={panel} />
              </span>
              <span className={isActive ? 'relative truncate' : 'sr-only'}>{LABELS[panel]}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TabGlyph({ panel }: { readonly panel: PanelId }) {
  const className = 'h-3.5 w-3.5';
  if (panel === 'analysis') return <ScanIcon className={className} />;
  if (panel === 'privacy') return <ShieldIcon className={className} />;
  if (panel === 'history') return <ClockIcon className={className} />;
  if (panel === 'bookmarks') return <StarIcon className={className} />;
  return <CookieIcon className={className} />;
}

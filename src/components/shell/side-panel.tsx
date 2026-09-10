'use client';

import { ClockIcon, ShieldIcon, StarIcon } from '@/components/ui/icons';

export const PANELS = ['privacy', 'history', 'bookmarks', 'cookies'] as const;
export type PanelId = (typeof PANELS)[number];

const LABELS: Record<PanelId, string> = {
  privacy: 'Privacy',
  history: 'History',
  bookmarks: 'Bookmarks',
  cookies: 'Cookies',
};

export function PanelTabs({
  active,
  onSelect,
}: {
  readonly active: PanelId;
  readonly onSelect: (panel: PanelId) => void;
}) {
  return (
    <div role="tablist" aria-label="Side panels" className="flex border-b border-ink-edge bg-ink">
      {PANELS.map((panel) => {
        const isActive = panel === active;
        return (
          <button
            key={panel}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(panel)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 font-body text-xs transition-colors duration-150 ${
              isActive
                ? 'border-verdigris text-parchment'
                : 'border-transparent text-ash-dim hover:text-ash-light'
            }`}
          >
            <PanelIcon panel={panel} />
            <span className="hidden sm:inline">{LABELS[panel]}</span>
          </button>
        );
      })}
    </div>
  );
}

function PanelIcon({ panel }: { readonly panel: PanelId }) {
  const className = 'h-3.5 w-3.5';
  if (panel === 'privacy') return <ShieldIcon className={className} />;
  if (panel === 'history') return <ClockIcon className={className} />;
  if (panel === 'bookmarks') return <StarIcon className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="6.5" r="0.9" fill="currentColor" />
      <circle cx="9.5" cy="9" r="0.9" fill="currentColor" />
      <circle cx="6.5" cy="10" r="0.7" fill="currentColor" />
    </svg>
  );
}

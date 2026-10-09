'use client';

import { AnimatePresence, LayoutGroup, motion, useInView } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  OBJECTIVES,
  STATUS_LABEL,
  type ObjectiveId,
  type ObjectiveStatus,
} from '@/components/landing/objectives';
import { StatusBadge } from '@/components/landing/status-badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { CheckIcon, LockIcon, MaskIcon, ShieldIcon, UnlockIcon } from '@/components/ui/icons';
import { scoreBand } from '@/lib/scan/privacy-score';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/**
 * "What works, and what doesn't" as a filterable bento. Each objective gets a
 * small live illustration of the behaviour it describes; the copy and status
 * still come from OBJECTIVES, so this grid cannot disagree with the app about
 * what is real.
 */

export type AnalysisShowcase = {
  readonly domain: string;
  readonly profileLabel: string;
  readonly total: number;
  readonly band: 'strong' | 'mixed' | 'poor';
  readonly categories: readonly { readonly label: string; readonly score: number }[];
};

type Filter = 'all' | ObjectiveStatus;

const FILTERS: readonly Filter[] = ['all', 'real', 'partial', 'simulated'];

const ORDER: readonly ObjectiveId[] = ['analysis', 'blocking', 'https', 'private', 'tabs', 'storage', 'cookies'];

const SPAN: Record<ObjectiveId, string> = {
  analysis: 'md:col-span-2 lg:col-span-4',
  blocking: 'lg:col-span-2',
  https: 'lg:col-span-2',
  private: 'lg:col-span-2',
  tabs: 'lg:col-span-2',
  storage: 'lg:col-span-3',
  cookies: 'lg:col-span-3',
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** A counter that ticks while the illustration is on screen and motion is allowed. */
function useTicker(intervalMs: number, isActive: boolean) {
  const [tick, setTick] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (!isActive || prefersReducedMotion) return;
    const id = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, isActive, prefersReducedMotion]);
  return tick;
}

export function ObjectivesBento({ analysis }: { readonly analysis: AnalysisShowcase }) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: OBJECTIVES.length, real: 0, partial: 0, simulated: 0 };
    for (const objective of OBJECTIVES) result[objective.status] += 1;
    return result;
  }, []);

  const visible = ORDER.map((id) => OBJECTIVES.find((objective) => objective.id === id)!).filter(
    (objective) => filter === 'all' || objective.status === filter,
  );

  return (
    <LayoutGroup>
      <div role="group" aria-label="Filter by status" className="mt-10 flex flex-wrap gap-1 rounded-lg border border-white/[0.07] p-1 sm:inline-flex">
        {FILTERS.map((entry) => {
          const isActive = entry === filter;
          return (
            <button
              key={entry}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(entry)}
              className={`relative rounded-md px-4 py-1.5 text-sm transition-colors duration-200 ${
                isActive ? 'text-void' : 'text-ash-light hover:text-white'
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="bento-filter"
                  className="absolute inset-0 rounded-md bg-parchment"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              ) : null}
              <span className="relative">
                {entry === 'all' ? 'Everything' : STATUS_LABEL[entry]}{' '}
                <span className={`font-mono text-xs ${isActive ? 'text-ink-line' : 'text-ash-dim'}`}>
                  {counts[entry]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <motion.ul layout className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* No initial={false} here: it propagates to every motion element
            inside the cards and would freeze the illustrations' first runs. */}
        <AnimatePresence mode="popLayout">
          {visible.map((objective) => (
            <motion.li
              key={objective.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: EASE }}
              className={`flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-ink-raised/60 ${SPAN[objective.id]}`}
            >
              <div
                aria-hidden="true"
                className={`relative overflow-hidden border-b border-white/[0.05] ${
                  objective.id === 'analysis' ? 'h-72 sm:h-64' : 'h-48'
                }`}
              >
                <Illustration id={objective.id} analysis={analysis} />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-medium leading-snug text-parchment">{objective.title}</h3>
                  <StatusBadge status={objective.status} />
                </div>
                <p className="mt-2 text-base text-ash-light">{objective.what}</p>
                {objective.caveat ? (
                  <p className="mt-4 border-l-2 border-amber/50 pl-3 text-sm text-ash">{objective.caveat}</p>
                ) : null}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}

function Illustration({ id, analysis }: { readonly id: ObjectiveId; readonly analysis: AnalysisShowcase }) {
  switch (id) {
    case 'analysis':
      return <AnalysisVisual analysis={analysis} />;
    case 'blocking':
      return <BlockingVisual />;
    case 'https':
      return <HttpsVisual />;
    case 'private':
      return <PrivateVisual />;
    case 'tabs':
      return <TabsVisual />;
    case 'storage':
      return <StorageVisual />;
    case 'cookies':
      return <CookiesVisual />;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

/* ── Illustrations ─────────────────────────────────────────────────────── */

const BAND_STROKE: Record<AnalysisShowcase['band'], string> = {
  strong: '#5BC2AA',
  mixed: '#D8A24A',
  poor: '#E0775A',
};

const BAND_BAR: Record<AnalysisShowcase['band'], string> = {
  strong: 'bg-verdigris-bright',
  mixed: 'bg-amber',
  poor: 'bg-ember',
};

function AnalysisVisual({ analysis }: { readonly analysis: AnalysisShowcase }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const size = 132;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <div ref={ref} className="flex h-full items-center gap-6 px-6 sm:gap-10 sm:px-10">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={BAND_STROKE[analysis.band]}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isInView ? circumference * (1 - analysis.total / 100) : circumference }}
            transition={{ duration: 1.6, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber value={analysis.total} className="font-display text-5xl leading-none text-white" />
          <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ash">privacy</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="technical truncate text-sm text-parchment">{analysis.domain}</p>
        <p className="font-mono text-[11px] text-amber-glow">modelled · {analysis.profileLabel}</p>
        <ul className="mt-3 space-y-2">
          {analysis.categories.map((category, index) => (
            <li key={category.label}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-ash-light">{category.label}</span>
                <span className="technical text-parchment">{category.score}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className={`h-full rounded-full ${BAND_BAR[scoreBand(category.score)]}`}
                  initial={{ width: 0 }}
                  animate={{ width: isInView ? `${category.score}%` : 0 }}
                  transition={{ duration: 1.1, delay: 0.3 + index * 0.08, ease: EASE }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const FLOW_DOMAINS = ['doubleclick.net', 'hotjar.com', 'connect.facebook.net', 'scorecardresearch.com'];

function BlockingVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <div ref={ref} className="relative h-full bg-gradient-to-r from-transparent via-transparent to-amber/[0.08]">
      <div className="absolute inset-y-6 right-12 w-px bg-gradient-to-b from-transparent via-amber/70 to-transparent" />
      <div className="absolute right-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-amber/40 bg-amber/10 text-amber-glow">
        <ShieldIcon className="h-5 w-5" />
      </div>
      <ul className="absolute inset-y-0 left-0 right-24 flex flex-col justify-center gap-2 pl-5">
        {FLOW_DOMAINS.map((domain, index) => (
          <motion.li
            key={domain}
            className="w-max"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { x: 0, opacity: 1 }
                : isInView
                  ? { x: [0, 0, 90, 120], opacity: [0, 1, 1, 0] }
                  : { x: 0, opacity: 0 }
            }
            transition={{
              duration: 3.2,
              delay: index * 0.8,
              repeat: Infinity,
              repeatDelay: 0.4,
              times: [0, 0.12, 0.8, 1],
              ease: 'easeIn',
            }}
          >
            <span className="flex items-center gap-1.5 rounded-full border border-amber/25 bg-ink/80 px-2.5 py-1 font-mono text-[11px] text-ash-light">
              <span className="h-1 w-1 rounded-full bg-amber" />
              {domain}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function HttpsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const tick = useTicker(2200, isInView);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isUpgraded = prefersReducedMotion ? true : tick % 2 === 1;

  return (
    <div ref={ref} className="flex h-full flex-col items-center justify-center gap-4 px-6">
      <div
        className={`flex w-full max-w-[17rem] items-center gap-2 rounded-full border px-3.5 py-2 transition-colors duration-500 ${
          isUpgraded ? 'border-verdigris-bright/40 bg-verdigris/10' : 'border-amber/40 bg-amber/[0.08]'
        }`}
      >
        <motion.span
          key={String(isUpgraded)}
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className={isUpgraded ? 'text-verdigris-bright' : 'text-amber-glow'}
        >
          {isUpgraded ? <LockIcon className="h-4 w-4" /> : <UnlockIcon className="h-4 w-4" />}
        </motion.span>
        <span className="technical text-sm text-parchment">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={String(isUpgraded)}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`inline-block ${isUpgraded ? 'text-verdigris-glow' : 'text-amber-glow'}`}
            >
              {isUpgraded ? 'https://' : 'http://'}
            </motion.span>
          </AnimatePresence>
          example.com
        </span>
      </div>
      <p className="font-mono text-[11px] text-ash">
        {isUpgraded ? 'bare hostnames become https' : 'explicit http stops at a warning'}
      </p>
    </div>
  );
}

function PrivateVisual() {
  return (
    <div className="relative flex h-full items-center justify-center bg-gradient-to-b from-amber/[0.08] to-transparent px-6">
      <MaskIcon className="absolute -right-4 -top-4 h-32 w-32 text-amber/10" />
      <div className="relative w-full max-w-[17rem] rounded-xl border border-amber/25 bg-ink/80 p-3.5 font-mono text-[11px]">
        <p className="text-ash">
          <span className="text-amber-glow">POST</span> /api/history
        </p>
        <p className="mt-1 text-ash-dim">{'{ isPrivate: true, … }'}</p>
        <div className="my-2.5 h-px bg-white/[0.06]" />
        <p className="flex items-center gap-2 text-parchment">
          <span className="rounded-sm bg-amber/15 px-1.5 text-amber-glow">202</span>
          {'{ recorded: false }'}
        </p>
        <p className="mt-1 text-ash-dim">refused on the server</p>
      </div>
    </div>
  );
}

const TAB_SITES = [
  { title: 'Onion routing', url: 'en.wikipedia.org/wiki/Onion_routing' },
  { title: 'MDN — CSP', url: 'developer.mozilla.org/…/CSP' },
  { title: 'RFC 9110', url: 'rfc-editor.org/rfc/rfc9110' },
];

function TabsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const tick = useTicker(1700, isInView);
  const active = tick % TAB_SITES.length;

  return (
    <div ref={ref} className="flex h-full flex-col justify-center px-5">
      <div className="rounded-xl border border-white/[0.07] bg-ink-sunken">
        <div className="flex gap-1 px-2 pt-2">
          {TAB_SITES.map((site, index) => (
            <div key={site.title} className="relative min-w-0 flex-1 rounded-t-md px-2 py-1.5">
              {index === active ? (
                <motion.span
                  layoutId="bento-tab"
                  className="absolute inset-0 rounded-t-md bg-ink-raised"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              ) : null}
              <span
                className={`relative z-10 block truncate font-mono text-[10px] ${
                  index === active ? 'text-parchment' : 'text-ash-dim'
                }`}
              >
                {site.title}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-b-xl bg-ink-raised px-3 py-2.5">
          <LockIcon className="h-3 w-3 shrink-0 text-verdigris-bright" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={active}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.25 }}
              className="technical truncate text-[11px] text-ash-light"
            >
              {TAB_SITES[active]!.url}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const HISTORY_ROWS = [
  { title: 'Onion routing — Wikipedia', host: 'en.wikipedia.org' },
  { title: 'X-Frame-Options — MDN', host: 'developer.mozilla.org' },
  { title: 'Computer security — Open Library', host: 'openlibrary.org' },
  { title: 'RFC 9110: HTTP Semantics', host: 'rfc-editor.org' },
  { title: 'Texts — Internet Archive', host: 'archive.org' },
];

function StorageVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const tick = useTicker(2000, isInView);
  const rows = [0, 1, 2].map((offset) => {
    const index = (tick + HISTORY_ROWS.length - offset) % HISTORY_ROWS.length;
    return { ...HISTORY_ROWS[index]!, key: tick - offset };
  });

  return (
    <div ref={ref} className="flex h-full items-center gap-5 px-6">
      <ul className="relative min-w-0 flex-1 space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row, index) => (
            <motion.li
              key={row.key}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1 - index * 0.25, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-verdigris/15 font-mono text-[10px] text-verdigris-glow">
                {row.host.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs text-parchment">{row.title}</span>
                <span className="technical block truncate text-[10px] text-ash-dim">{row.host}</span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="hidden shrink-0 flex-col items-center gap-2 sm:flex">
        <svg viewBox="0 0 48 56" className="h-14 w-12" fill="none">
          <ellipse cx="24" cy="10" rx="19" ry="6.5" stroke="#5BC2AA" strokeWidth="1.5" />
          <path d="M5 10v36c0 3.6 8.5 6.5 19 6.5S43 49.6 43 46V10" stroke="#5BC2AA" strokeWidth="1.5" />
          <path d="M5 22c0 3.6 8.5 6.5 19 6.5S43 25.6 43 22M5 34c0 3.6 8.5 6.5 19 6.5S43 37.6 43 34" stroke="#5BC2AA" strokeOpacity="0.5" strokeWidth="1.5" />
        </svg>
        <span className="flex items-center gap-1 font-mono text-[10px] text-verdigris-glow">
          <CheckIcon className="h-3 w-3" />
          your account
        </span>
      </div>
    </div>
  );
}

const COOKIE_ROWS = [
  { name: 'next-auth.session-token', why: 'httpOnly — hidden from scripts' },
  { name: '_ga', why: 'another origin — invisible here' },
  { name: 'IDE', why: 'another origin — invisible here' },
];

function CookiesVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-6">
      {COOKIE_ROWS.map((row) => (
        <div
          key={row.name}
          className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
        >
          <span className="technical select-none truncate text-xs text-ash-light blur-[3px]">{row.name}=a8f3…c91e</span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-ash">
            <LockIcon className="h-3 w-3" />
            {row.why}
          </span>
        </div>
      ))}
      <p className="mt-1 font-mono text-[10px] text-ash-dim">readable by this page: first-party, script-visible only</p>
    </div>
  );
}

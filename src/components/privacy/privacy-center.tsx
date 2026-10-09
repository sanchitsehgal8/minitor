'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState, type MouseEvent, type ReactNode } from 'react';

import { PrivacyReport } from '@/components/privacy/privacy-report';
import {
  BAND,
  EASE_OUT,
  EASE_UI,
  SPRING,
  staggerChild,
  staggerParent,
} from '@/components/privacy/privacy-primitives';
import { ScanHistory } from '@/components/privacy/scan-history';
import { ScanProgress } from '@/components/privacy/scan-progress';
import { WebsiteComparison } from '@/components/privacy/website-comparison';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  ArrowRightIcon,
  ClockIcon,
  GlobeIcon,
  LayersIcon,
  MaskIcon,
  ScanIcon,
  WarnIcon,
} from '@/components/ui/icons';
import { useRovingTablist } from '@/components/ui/tablist';
import { useScans } from '@/hooks/use-scans';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { scoreBand } from '@/lib/scan/privacy-score';

const CENTER_VIEWS = ['scan', 'history', 'compare'] as const;
type CenterView = (typeof CENTER_VIEWS)[number];

const VIEW_ICON: Record<CenterView, typeof ScanIcon> = {
  scan: ScanIcon,
  history: ClockIcon,
  compare: LayersIcon,
};

/**
 * Privacy Center: the entry point for website privacy analysis (spec §1).
 *
 * Lives inside the browser shell's side panel so analysis is part of browsing
 * rather than a separate destination. Takes the current site from the active
 * tab, and also accepts a manually typed URL.
 */
export function PrivacyCenter({
  currentDomain,
  isPrivate,
}: {
  /** Domain of the active tab, or '' on the start page. */
  readonly currentDomain: string;
  readonly isPrivate: boolean;
}) {
  const scans = useScans(isPrivate);
  const [view, setView] = useState<CenterView>('scan');
  const [manualUrl, setManualUrl] = useState('');

  const centerIndex = CENTER_VIEWS.indexOf(view);
  const { tabProps: centerTabProps } = useRovingTablist(CENTER_VIEWS.length, centerIndex, (index) => {
    const next = CENTER_VIEWS[index];
    if (next) setView(next);
  });

  // One keyed child per phase, so scanning → report → back crossfades rather
  // than snapping. Idle and error share a key: an error is a note on the same
  // screen, not a different one.
  const phaseKey =
    scans.phase.kind === 'scanning'
      ? 'scanning'
      : scans.phase.kind === 'done'
        ? `report-${scans.phase.scan.id}`
        : 'home';

  let content;
  if (scans.phase.kind === 'scanning') {
    content = <ScanProgress stageIndex={scans.phase.stageIndex} target={scans.phase.target} />;
  } else if (scans.phase.kind === 'done') {
    const { scan, stored } = scans.phase;
    content = (
      <PrivacyReport
        scan={scan}
        stored={stored}
        domainHistory={scans.history.filter((row) => row.domain === scan.domain)}
        onToggleMonitoring={(id, monitored) => void scans.toggleMonitoring(id, monitored)}
        onRescan={() => void scans.startScan(scan.domain)}
        onBack={scans.reset}
      />
    );
  } else {
    content = (
      <div className="flex h-full flex-col">
        <div className="px-3 pt-3">
          <div
            role="tablist"
            aria-label="Privacy Center sections"
            className="grid grid-cols-3 rounded-full border border-white/[0.06] bg-white/[0.025] p-0.5"
          >
            {CENTER_VIEWS.map((entry, index) => {
              const isActive = view === entry;
              const Icon = VIEW_ICON[entry];
              return (
                <button
                  key={entry}
                  type="button"
                  {...centerTabProps(index, `center-tab-${entry}`, `center-panel-${entry}`)}
                  onClick={() => setView(entry)}
                  className={`relative flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-body text-xs font-medium capitalize transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-ash hover:text-parchment'
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="center-tab-indicator"
                      transition={SPRING}
                      className="absolute inset-0 rounded-full border border-white/[0.1] bg-white/[0.08]"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 14px -6px rgba(0,0,0,0.8)' }}
                    />
                  ) : null}
                  <Icon className={`relative h-3.5 w-3.5 ${isActive ? 'text-verdigris-bright' : ''}`} />
                  <span className="relative">{entry === 'compare' ? 'Compare' : entry}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* One panel node whose identity follows the active tab, so each tab's
            aria-controls resolves without duplicating the scroll container. */}
        <div
          id={`center-panel-${view}`}
          role="tabpanel"
          aria-labelledby={`center-tab-${view}`}
          tabIndex={0}
          className="log-scroll mt-1 flex-1 overflow-y-auto"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE_UI }}
              className="h-full"
            >
              {view === 'scan' ? (
                <ScanHome
                  currentDomain={currentDomain}
                  isPrivate={isPrivate}
                  manualUrl={manualUrl}
                  onManualUrlChange={setManualUrl}
                  scans={scans}
                />
              ) : null}

              {view === 'history' ? (
                <ScanHistory
                  scans={scans.history}
                  isLoading={scans.isLoadingHistory}
                  error={scans.historyError}
                  onOpen={scans.openStoredScan}
                  onRemove={(id) => void scans.removeScan(id)}
                  onRetry={() => void scans.refreshHistory()}
                />
              ) : null}

              {view === 'compare' ? (
                <WebsiteComparison scans={scans.latestByDomain} isLoading={scans.isLoadingHistory} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.22, ease: EASE_UI }}
        className="h-full"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

/** The scan tab: hero, the current site, a manual URL, and running totals. */
function ScanHome({
  currentDomain,
  isPrivate,
  manualUrl,
  onManualUrlChange,
  scans,
}: {
  readonly currentDomain: string;
  readonly isPrivate: boolean;
  readonly manualUrl: string;
  readonly onManualUrlChange: (value: string) => void;
  readonly scans: ReturnType<typeof useScans>;
}) {
  const averageBand = BAND[scoreBand(scans.aggregates.averagePrivacy)];

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className="px-4 pb-6 pt-3">
      <motion.div
        variants={staggerChild}
        className="relative -mx-1 overflow-hidden rounded-2xl border border-white/[0.06] px-5 pb-5 pt-5"
        style={{
          background:
            'radial-gradient(120% 90% at 100% 0%, rgba(62,142,126,0.22), transparent 55%), linear-gradient(180deg, #12161D, #0B0E13)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div aria-hidden="true" className="bg-grid mask-radial pointer-events-none absolute inset-0 opacity-60 [background-size:24px_24px]" />
        <OrbitMark />
        <div className="relative max-w-[15rem]">
          <p className="eyebrow text-verdigris-bright">Privacy Center</p>
          <h3 className="mt-2 font-display text-4xl leading-[1.02] text-gradient">Analyse a website</h3>
          <p className="mt-3 text-xs leading-relaxed text-ash-light">
            See which domains a site contacts, what MiniTor’s rules would block, and how its
            privacy and security observations score.
          </p>
        </div>
      </motion.div>

      <motion.div variants={staggerChild} className="mt-3">
        {currentDomain ? (
          <button
            type="button"
            onClick={() => void scans.startScan(currentDomain)}
            onMouseMove={trackSpotlight}
            className="spotlight border-beam group flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-left shadow-lift transition-transform duration-300 ease-out hover:-translate-y-px active:scale-[0.99]"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright"
              style={{ boxShadow: '0 0 20px -6px rgba(91,194,170,0.7)' }}
            >
              <GlobeIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-body text-xs font-medium text-verdigris-bright">
                Analyse this site
              </span>
              <span className="technical mt-0.5 block truncate text-sm text-white">{currentDomain}</span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-parchment transition-all duration-300 group-hover:bg-verdigris-bright group-hover:text-void"
            >
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </button>
        ) : (
          <p className="flex gap-3 rounded-xl border border-dashed border-white/[0.09] px-3.5 py-3 text-xs leading-relaxed text-ash">
            <GlobeIcon className="mt-0.5 h-4 w-4 shrink-0 text-ash-dim" />
            <span>
              No page is open in this tab. Load a site to analyse it directly, or enter any URL
              below.
            </span>
          </p>
        )}
      </motion.div>

      <motion.form
        variants={staggerChild}
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (manualUrl.trim()) void scans.startScan(manualUrl);
        }}
      >
        <label htmlFor="scan-url" className="eyebrow block">
          Or analyse any URL
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-full border border-white/[0.09] bg-black/30 py-1 pl-4 pr-1 transition-all duration-200 focus-within:border-verdigris-bright/60 focus-within:bg-black/40 focus-within:shadow-[0_0_0_4px_rgba(91,194,170,0.12)] hover:border-white/[0.15]">
          <ScanIcon className="h-4 w-4 shrink-0 text-ash" />
          <input
            id="scan-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={manualUrl}
            onChange={(event) => onManualUrlChange(event.target.value)}
            placeholder="example.com"
            className="technical min-w-0 flex-1 bg-transparent py-1.5 text-sm text-parchment placeholder:text-ash-dim focus:outline-none"
          />
          <button
            type="submit"
            disabled={manualUrl.trim().length === 0}
            className="btn-primary shrink-0 px-4 py-2 text-xs"
          >
            Analyse<span className="sr-only"> website</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.form>

      <AnimatePresence initial={false}>
        {scans.phase.kind === 'error' ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_UI }}
            className="overflow-hidden"
          >
            <span className="mt-3 flex gap-2 rounded-lg border border-amber/30 bg-amber/[0.08] px-3 py-2.5 text-xs leading-relaxed text-amber">
              <WarnIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {scans.phase.message}
            </span>
          </motion.p>
        ) : null}
      </AnimatePresence>

      {isPrivate ? (
        <motion.p
          variants={staggerChild}
          className="mt-3 flex gap-2 rounded-lg border border-amber/20 bg-amber/[0.05] px-3 py-2.5 text-xs leading-relaxed text-amber"
        >
          <MaskIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          You are in private mode. Scans still run, but they are not saved to your history.
        </motion.p>
      ) : null}

      {scans.aggregates.scanCount > 0 ? (
        <motion.div variants={staggerChild} className="mt-6">
          <p className="eyebrow">Your privacy analysis so far</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Sites analysed">
              <AnimatedNumber value={scans.aggregates.scanCount} />
            </Stat>
            <Stat label="Average privacy">
              <span className={averageBand.text}>
                <AnimatedNumber value={scans.aggregates.averagePrivacy} />
              </span>
              <span className="technical ml-0.5 text-xs text-ash-dim">/100</span>
              <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ backgroundImage: `linear-gradient(90deg, ${averageBand.from}, ${averageBand.to})` }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${scans.aggregates.averagePrivacy}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: EASE_OUT }}
                />
              </span>
            </Stat>
            <Stat label="Requests analysed">
              <AnimatedNumber value={scans.aggregates.requestsAnalysed} />
            </Stat>
            <Stat label="Tracker domains blocked">
              <span className="text-amber-glow">
                <AnimatedNumber value={scans.aggregates.trackersBlocked} />
              </span>
            </Stat>
          </dl>
          {scans.monitored.length > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-ash">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris-bright opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verdigris-bright" />
              </span>
              {scans.monitored.length} monitored{' '}
              {scans.monitored.length === 1 ? 'website' : 'websites'}
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** Updates the spotlight's --x/--y so its highlight follows the cursor. */
function trackSpotlight(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`);
}

function Stat({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="surface relative overflow-hidden px-3.5 py-3">
      <dt className="text-xs leading-tight text-ash">{label}</dt>
      <dd className="mt-1.5 font-display text-3xl leading-none text-white">{children}</dd>
    </div>
  );
}

/**
 * The hero's mark: three domains orbiting a site. Decorative, and its rotation
 * is gated on reduced motion explicitly since it never ends.
 */
function OrbitMark() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const orbits = [
    { r: 22, color: '#5BC2AA', duration: 9, start: 0 },
    { r: 36, color: '#D8A24A', duration: 14, start: 140 },
    { r: 50, color: '#E0775A', duration: 22, start: 260 },
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute -right-6 -top-6 h-[150px] w-[150px] opacity-90"
    >
      <defs>
        <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8AF0D6" />
          <stop offset="100%" stopColor="#3E8E7E" />
        </radialGradient>
      </defs>
      {orbits.map((orbit) => (
        <circle key={orbit.r} cx="60" cy="60" r={orbit.r} fill="none" stroke="#FFFFFF" strokeOpacity={0.07} />
      ))}
      <circle cx="60" cy="60" r="7" fill="url(#orbit-core)" style={{ filter: 'drop-shadow(0 0 6px #5BC2AA)' }} />
      {orbits.map((orbit) => (
        <motion.g
          // Keyed on the preference too: it resolves after mount, and only a
          // remount reliably stops a repeating animation already running.
          key={`dot-${orbit.r}-${prefersReducedMotion ? 'still' : 'spin'}`}
          style={{ originX: '60px', originY: '60px', rotate: orbit.start }}
          animate={prefersReducedMotion ? undefined : { rotate: orbit.start + 360 }}
          transition={{ duration: orbit.duration, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx={60 + orbit.r} cy="60" r="2.6" fill={orbit.color} style={{ filter: `drop-shadow(0 0 4px ${orbit.color})` }} />
        </motion.g>
      ))}
    </svg>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';

import { CookieAnalysis } from '@/components/privacy/cookie-analysis';
import { DomainDetail, DomainGraph } from '@/components/privacy/domain-graph';
import { MonitoringCard } from '@/components/privacy/monitoring-card';
import {
  BAND,
  SPRING,
  staggerChild,
  staggerParent,
} from '@/components/privacy/privacy-primitives';
import { PrivacyScoreCard } from '@/components/privacy/privacy-score-card';
import { ProtectionSummary } from '@/components/privacy/protection-summary';
import { RequestOverview, RequestTable } from '@/components/privacy/request-table';
import { ScoreHistory } from '@/components/privacy/score-history';
import { SecurityFindingsCard } from '@/components/privacy/security-findings-card';
import { SiteControls } from '@/components/privacy/site-controls';
import { ParameterAnalysis } from '@/components/privacy/parameter-analysis';
import { TrackerBreakdown } from '@/components/privacy/tracker-breakdown';
import { ArrowLeftIcon, GlobeIcon, ReloadIcon, WarnIcon } from '@/components/ui/icons';
import { scoreBand } from '@/lib/scan/privacy-score';
import {
  applySiteOverride,
  applyStrictThirdPartyBlocking,
  buildConnectionGraph,
} from '@/lib/scan/scan-engine';
import { useRovingTablist } from '@/components/ui/tablist';
import type { StoredScan } from '@/lib/client/api-client';

type ReportTab = 'overview' | 'network' | 'trackers' | 'cookies' | 'security' | 'controls';

const TABS: readonly { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'network', label: 'Network' },
  { id: 'trackers', label: 'Trackers' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'security', label: 'Security' },
  { id: 'controls', label: 'Controls' },
];

/**
 * The website privacy report (spec §3).
 *
 * Assembles the section components and owns only view state — which tab is
 * open, which domain is selected, whether a site override is active. Every
 * number it renders comes from the scan engine and scoring services.
 *
 * The header scrolls away with the content and only the tab bar sticks, so on
 * a short panel the report itself gets the height rather than its chrome.
 */
export function PrivacyReport({
  scan,
  stored,
  domainHistory,
  onToggleMonitoring,
  onRescan,
  onBack,
}: {
  readonly scan: StoredScan;
  readonly stored: boolean;
  /** Every stored scan of this domain, newest first, for score history. */
  readonly domainHistory: readonly StoredScan[];
  readonly onToggleMonitoring: (id: string, monitored: boolean) => void;
  readonly onRescan: () => void;
  readonly onBack: () => void;
}) {
  const [tab, setTab] = useState<ReportTab>('overview');
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Switching tabs from further down keeps the bar pinned and shows the new
  // section from its top, instead of landing mid-way through it. Measured from
  // the header, because a stuck sticky bar reports its stuck offset.
  const selectTab = (next: ReportTab) => {
    setTab(next);
    const scroller = scrollRef.current;
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    if (scroller && scroller.scrollTop > headerHeight) scroller.scrollTop = headerHeight;
  };

  const { tabProps: reportTabProps } = useRovingTablist(
    TABS.length,
    TABS.findIndex((entry) => entry.id === tab),
    (index) => {
      const next = TABS[index];
      if (next) selectTab(next.id);
    },
  );
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [isOverridden, setIsOverridden] = useState(false);
  const [blockThirdParty, setBlockThirdParty] = useState(false);

  // Site rules re-derive the whole report through the engine, so scores stay
  // consistent with the decisions shown rather than being patched in place.
  // Strict blocking wins over a temporary allowance: the stricter rule should
  // never be silently undone by the looser one.
  const active = useMemo(() => {
    if (blockThirdParty) return applyStrictThirdPartyBlocking(scan);
    return isOverridden ? applySiteOverride(scan) : scan;
  }, [scan, isOverridden, blockThirdParty]);
  const graph = useMemo(() => buildConnectionGraph(active), [active]);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.domain === selectedDomain) ?? null,
    [graph.nodes, selectedDomain],
  );

  const privacyBand = BAND[scoreBand(active.privacy.total)];
  const securityBand = BAND[scoreBand(active.security.total)];

  const detail = (
    <AnimatePresence initial={false}>
      {selectedNode ? (
        <DomainDetail key="domain-detail" node={selectedNode} onClose={() => setSelectedDomain(null)} />
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="log-scroll relative flex-1 overflow-y-auto">
        <header ref={headerRef} className="relative overflow-hidden px-4 pb-4 pt-3">
          {/* Light from the score's band washing down from the top edge. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: privacyBand.glow, opacity: 0.14 }}
          />

          <div className="relative flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-2 py-1 text-xs">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Privacy Center
            </button>
            <button type="button" onClick={onRescan} className="btn-secondary px-3.5 py-1.5 text-xs">
              <ReloadIcon className="h-3.5 w-3.5" />
              Scan again
            </button>
          </div>

          <div className="relative mt-4 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-verdigris-bright shadow-lift"
            >
              <GlobeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Website</p>
              <h2 className="truncate font-display text-3xl leading-none text-white" title={active.domain}>
                {active.domain}
              </h2>
            </div>
          </div>

          <div aria-hidden="true" className="relative mt-3 flex flex-wrap gap-1.5">
            <span className={`chip ${privacyBand.chip}`}>Privacy {active.privacy.total}</span>
            <span className={`chip ${securityBand.chip}`}>Security {active.security.total}</span>
            <span className="chip border-white/[0.08] bg-white/[0.03] text-ash-light">
              {active.totals.totalRequests} requests
            </span>
          </div>

          {/* Provenance, stated in the report itself rather than a footnote. */}
          <p className="relative mt-3.5 flex gap-2.5 rounded-lg border border-amber/25 bg-amber/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber backdrop-blur-md">
            <WarnIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Generated from MiniTor’s “{active.profileLabel}” profile. A web page cannot inspect
              another site’s network traffic, so this report models what MiniTor’s rules would do
              rather than measuring live requests.
            </span>
          </p>

          {!stored ? (
            <p className="relative mt-2 text-xs text-ash">
              This scan was not saved — private tabs do not store scan history.
            </p>
          ) : null}
        </header>

        <div
          className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-sunken/85 px-3 py-2 backdrop-blur-xl"
        >
          <div
            role="tablist"
            aria-label="Report sections"
            className="grid grid-cols-6 rounded-full border border-white/[0.06] bg-white/[0.025] p-0.5"
          >
            {TABS.map((entry, index) => {
              const isActive = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  {...reportTabProps(index, `report-tab-${entry.id}`, `report-panel-${entry.id}`)}
                  onClick={() => selectTab(entry.id)}
                  className={`relative rounded-full px-1 py-1.5 font-body text-xs font-medium transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-ash hover:text-parchment'
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="report-tab-indicator"
                      transition={SPRING}
                      className="absolute inset-0 rounded-full border border-white/[0.1] bg-white/[0.08]"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 14px -6px rgba(0,0,0,0.8)' }}
                    />
                  ) : null}
                  <span className="relative">{entry.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          id={`report-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`report-tab-${tab}`}
          tabIndex={0}
          className="px-4 pb-6 pt-4"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              variants={staggerParent}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-3"
            >
              {tab === 'overview' ? (
                <>
                  <motion.div variants={staggerChild}>
                    <PrivacyScoreCard score={active.privacy} />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <SecurityFindingsCard score={active.security} />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <RequestOverview totals={active.totals} />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <ProtectionSummary
                      totals={active.totals}
                      requests={active.requests}
                      isSimulated={active.dataSource === 'simulated-profile'}
                    />
                  </motion.div>
                  {domainHistory.length > 1 ? (
                    <motion.div variants={staggerChild}>
                      <ScoreHistory scans={domainHistory} />
                    </motion.div>
                  ) : null}
                </>
              ) : null}

              {tab === 'network' ? (
                <>
                  <motion.div variants={staggerChild}>
                    <RequestOverview totals={active.totals} />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <DomainGraph
                      graph={graph}
                      selectedDomain={selectedDomain}
                      onSelectDomain={setSelectedDomain}
                    />
                  </motion.div>
                  {/* Directly under the graph, so a node's details open where the click was. */}
                  {detail}
                  <motion.div variants={staggerChild}>
                    <RequestTable requests={active.requests} onSelectDomain={setSelectedDomain} />
                  </motion.div>
                </>
              ) : null}

              {tab === 'trackers' ? (
                <>
                  {detail}
                  <motion.div variants={staggerChild}>
                    <TrackerBreakdown trackers={active.trackers} onSelectDomain={setSelectedDomain} />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <ParameterAnalysis
                      parameters={active.parameters}
                      sampleUrl={
                        active.requests.find(
                          (request) => request.url.includes('utm_') || request.url.includes('clid='),
                        )?.url ?? null
                      }
                    />
                  </motion.div>
                </>
              ) : null}

              {tab === 'cookies' ? (
                <motion.div variants={staggerChild}>
                  <CookieAnalysis cookies={active.cookies} />
                </motion.div>
              ) : null}

              {tab === 'security' ? (
                <motion.div variants={staggerChild}>
                  <SecurityFindingsCard score={active.security} />
                </motion.div>
              ) : null}

              {tab === 'controls' ? (
                <>
                  <motion.div variants={staggerChild}>
                    <SiteControls
                      domain={active.domain}
                      blockedCount={scan.totals.blockedRequests}
                      isOverridden={isOverridden}
                      blockThirdPartyTrackers={blockThirdParty}
                      onAllowTemporarily={() => setIsOverridden(true)}
                      onReset={() => {
                        setIsOverridden(false);
                        setBlockThirdParty(false);
                      }}
                      onToggleThirdPartyBlocking={setBlockThirdParty}
                    />
                  </motion.div>
                  <motion.div variants={staggerChild}>
                    <MonitoringCard
                      domain={active.domain}
                      isMonitored={scan.monitored}
                      lastScannedAt={scan.scannedAt}
                      canMonitor={stored}
                      onToggle={(next) => onToggleMonitoring(scan.id, next)}
                    />
                  </motion.div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

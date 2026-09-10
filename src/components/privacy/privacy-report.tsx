'use client';

import { useMemo, useState } from 'react';

import { CookieAnalysis } from '@/components/privacy/cookie-analysis';
import { DomainDetail, DomainGraph } from '@/components/privacy/domain-graph';
import { MonitoringCard } from '@/components/privacy/monitoring-card';
import { PrivacyScoreCard } from '@/components/privacy/privacy-score-card';
import { ProtectionSummary } from '@/components/privacy/protection-summary';
import { RequestOverview, RequestTable } from '@/components/privacy/request-table';
import { ScoreHistory } from '@/components/privacy/score-history';
import { SecurityFindingsCard } from '@/components/privacy/security-findings-card';
import { SiteControls } from '@/components/privacy/site-controls';
import { ParameterAnalysis } from '@/components/privacy/parameter-analysis';
import { TrackerBreakdown } from '@/components/privacy/tracker-breakdown';
import {
  applySiteOverride,
  applyStrictThirdPartyBlocking,
  buildConnectionGraph,
} from '@/lib/scan/scan-engine';
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

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-ink-edge px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-xs text-ash transition-colors duration-150 hover:text-parchment"
        >
          ← Privacy Center
        </button>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ash-dim">Website</p>
            <h2 className="technical truncate text-base text-parchment">{active.domain}</h2>
          </div>
          <button
            type="button"
            onClick={onRescan}
            className="shrink-0 rounded-md border border-ink-edge px-2.5 py-1 font-body text-xs text-ash-light transition-colors duration-150 hover:border-ash-dim hover:text-parchment"
          >
            Scan again
          </button>
        </div>

        {/* Provenance, stated in the report itself rather than a footnote. */}
        <p className="mt-2.5 rounded-md border border-amber-dim bg-amber-dim/12 px-2.5 py-2 text-xs leading-relaxed text-amber">
          Generated from MiniTor’s “{active.profileLabel}” profile. A web page cannot inspect another
          site’s network traffic, so this report models what MiniTor’s rules would do rather than
          measuring live requests.
        </p>

        {!stored ? (
          <p className="mt-2 text-xs text-ash-dim">
            This scan was not saved — private tabs do not store scan history.
          </p>
        ) : null}

        <div role="tablist" aria-label="Report sections" className="mt-3 flex flex-wrap gap-1">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors duration-150 ${
                tab === entry.id
                  ? 'border-verdigris bg-verdigris-dim/25 text-verdigris'
                  : 'border-ink-edge text-ash hover:border-ash-dim hover:text-parchment'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      <div className="log-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {tab === 'overview' ? (
          <>
            <PrivacyScoreCard score={active.privacy} />
            <SecurityFindingsCard score={active.security} />
            <RequestOverview totals={active.totals} />
            <ProtectionSummary
              totals={active.totals}
              requests={active.requests}
              isSimulated={active.dataSource === 'simulated-profile'}
            />
            {domainHistory.length > 1 ? <ScoreHistory scans={domainHistory} /> : null}
          </>
        ) : null}

        {tab === 'network' ? (
          <>
            <RequestOverview totals={active.totals} />
            {selectedNode ? (
              <DomainDetail node={selectedNode} onClose={() => setSelectedDomain(null)} />
            ) : null}
            <DomainGraph
              graph={graph}
              selectedDomain={selectedDomain}
              onSelectDomain={setSelectedDomain}
            />
            <RequestTable requests={active.requests} onSelectDomain={setSelectedDomain} />
          </>
        ) : null}

        {tab === 'trackers' ? (
          <>
            {selectedNode ? (
              <DomainDetail node={selectedNode} onClose={() => setSelectedDomain(null)} />
            ) : null}
            <TrackerBreakdown trackers={active.trackers} onSelectDomain={setSelectedDomain} />
            <ParameterAnalysis
              parameters={active.parameters}
              sampleUrl={
                active.requests.find((request) => request.url.includes('utm_') || request.url.includes('clid='))
                  ?.url ?? null
              }
            />
          </>
        ) : null}

        {tab === 'cookies' ? <CookieAnalysis cookies={active.cookies} /> : null}

        {tab === 'security' ? <SecurityFindingsCard score={active.security} /> : null}

        {tab === 'controls' ? (
          <>
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
            <MonitoringCard
              domain={active.domain}
              isMonitored={scan.monitored}
              lastScannedAt={scan.scannedAt}
              canMonitor={stored}
              onToggle={(next) => onToggleMonitoring(scan.id, next)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

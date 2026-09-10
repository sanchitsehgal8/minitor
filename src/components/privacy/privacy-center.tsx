'use client';

import { useState } from 'react';

import { PrivacyReport } from '@/components/privacy/privacy-report';
import { ScanHistory } from '@/components/privacy/scan-history';
import { ScanProgress } from '@/components/privacy/scan-progress';
import { WebsiteComparison } from '@/components/privacy/website-comparison';
import { ShieldIcon } from '@/components/ui/icons';
import { useScans } from '@/hooks/use-scans';

type CenterView = 'scan' | 'history' | 'compare';

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

  if (scans.phase.kind === 'scanning') {
    return <ScanProgress stageIndex={scans.phase.stageIndex} target={scans.phase.target} />;
  }

  if (scans.phase.kind === 'done') {
    const { scan, stored } = scans.phase;
    return (
      <PrivacyReport
        scan={scan}
        stored={stored}
        domainHistory={scans.history.filter((row) => row.domain === scan.domain)}
        onToggleMonitoring={(id, monitored) => void scans.toggleMonitoring(id, monitored)}
        onRescan={() => void scans.startScan(scan.domain)}
        onBack={scans.reset}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Privacy Center sections" className="flex border-b border-ink-edge">
        {(['scan', 'history', 'compare'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={view === entry}
            onClick={() => setView(entry)}
            className={`flex-1 border-b-2 px-2 py-2.5 font-body text-xs capitalize transition-colors duration-150 ${
              view === entry
                ? 'border-verdigris text-parchment'
                : 'border-transparent text-ash-dim hover:text-ash-light'
            }`}
          >
            {entry === 'compare' ? 'Compare' : entry}
          </button>
        ))}
      </div>

      <div className="log-scroll flex-1 overflow-y-auto">
        {view === 'scan' ? (
          <div className="p-4">
            <h3 className="flex items-center gap-2 font-body text-sm font-medium text-parchment">
              <ShieldIcon className="h-4 w-4 text-verdigris" />
              Analyse a website
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ash">
              See which domains a site contacts, what MiniTor’s rules would block, and how its
              privacy and security observations score.
            </p>

            {currentDomain ? (
              <button
                type="button"
                onClick={() => void scans.startScan(currentDomain)}
                className="mt-4 w-full rounded-md border border-verdigris bg-verdigris-dim/20 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-verdigris-dim/30"
              >
                <span className="block font-body text-xs font-medium text-verdigris">
                  Analyse this site
                </span>
                <span className="technical mt-0.5 block truncate text-xs text-parchment">
                  {currentDomain}
                </span>
              </button>
            ) : (
              <p className="mt-4 rounded-md border border-ink-edge bg-ink px-3 py-2.5 text-xs leading-relaxed text-ash-dim">
                No page is open in this tab. Load a site to analyse it directly, or enter any URL
                below.
              </p>
            )}

            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (manualUrl.trim()) void scans.startScan(manualUrl);
              }}
            >
              <label htmlFor="scan-url" className="block text-xs text-ash-dim">
                Or analyse any URL
              </label>
              <input
                id="scan-url"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="example.com"
                className="technical mt-1 w-full rounded-md border border-ink-edge bg-ink px-2.5 py-2 text-xs text-parchment placeholder:text-ash-dim focus:border-verdigris focus:outline-none"
              />
              <button
                type="submit"
                disabled={manualUrl.trim().length === 0}
                className="mt-2 w-full rounded-md bg-verdigris px-3 py-2 font-body text-xs font-medium text-white transition-colors duration-150 hover:bg-verdigris-dim disabled:cursor-not-allowed disabled:bg-ink-edge disabled:text-ash-dim"
              >
                Analyse website
              </button>
            </form>

            {scans.phase.kind === 'error' ? (
              <p
                role="alert"
                className="mt-3 rounded-md border border-amber-dim bg-amber-dim/15 px-2.5 py-2 text-xs text-amber"
              >
                {scans.phase.message}
              </p>
            ) : null}

            {isPrivate ? (
              <p className="mt-3 text-xs leading-relaxed text-amber">
                You are in private mode. Scans still run, but they are not saved to your history.
              </p>
            ) : null}

            {scans.aggregates.scanCount > 0 ? (
              <div className="mt-5 border-t border-ink-edge pt-4">
                <p className="text-xs text-ash-dim">Your privacy analysis so far</p>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  <Stat label="Sites analysed" value={String(scans.aggregates.scanCount)} />
                  <Stat label="Average privacy" value={`${scans.aggregates.averagePrivacy}/100`} />
                  <Stat
                    label="Requests analysed"
                    value={scans.aggregates.requestsAnalysed.toLocaleString('en-GB')}
                  />
                  <Stat
                    label="Tracker domains blocked"
                    value={String(scans.aggregates.trackersBlocked)}
                  />
                </dl>
                {scans.monitored.length > 0 ? (
                  <p className="mt-2 text-xs text-ash-dim">
                    {scans.monitored.length} monitored{' '}
                    {scans.monitored.length === 1 ? 'website' : 'websites'}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {view === 'history' ? (
          <ScanHistory
            scans={scans.history}
            isLoading={scans.isLoadingHistory}
            error={scans.historyError}
            onOpen={scans.openStoredScan}
            onRemove={(id) => void scans.removeScan(id)}
          />
        ) : null}

        {view === 'compare' ? <WebsiteComparison scans={scans.latestByDomain} /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border border-ink-edge bg-ink px-2.5 py-2">
      <dt className="text-xs leading-tight text-ash-dim">{label}</dt>
      <dd className="technical mt-0.5 text-sm text-parchment">{value}</dd>
    </div>
  );
}

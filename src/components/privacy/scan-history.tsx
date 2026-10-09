'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { BAND, EASE_OUT, EASE_UI } from '@/components/privacy/privacy-primitives';
import { ScoreRing } from '@/components/privacy/score-dial';
import { ArrowRightIcon, ClockIcon, TrashIcon } from '@/components/ui/icons';
import { ErrorState } from '@/components/ui/panel-states';
import { scoreBand } from '@/lib/scan/privacy-score';
import type { StoredScan } from '@/lib/client/api-client';

/** Human-friendly relative day, matching the spec's "Scanned today" wording. */
function relativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);

  if (days <= 0 && now.toDateString() === then.toDateString()) return 'Scanned today';
  if (days <= 1) return 'Scanned yesterday';
  if (days < 7) return `Scanned ${days} days ago`;
  return `Scanned ${then.toLocaleDateString('en-GB')}`;
}

/** Previously analysed websites (spec §13). */
export function ScanHistory({
  scans,
  isLoading,
  error,
  onOpen,
  onRemove,
  onRetry,
}: {
  readonly scans: readonly StoredScan[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onOpen: (scan: StoredScan) => void;
  readonly onRemove: (id: string) => void;
  /** Lets a failed load be retried in place instead of needing a page reload. */
  readonly onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-end justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <p className="eyebrow">Saved reports</p>
          <h3 className="mt-1 font-display text-2xl leading-none text-parchment">Scan history</h3>
        </div>
        <p className="technical tabular pb-0.5 text-xs text-ash">
          {scans.length} {scans.length === 1 ? 'scan' : 'scans'} saved
        </p>
      </header>

      <div className="log-scroll flex-1 overflow-y-auto px-2 pb-3">
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

        {isLoading && scans.length === 0 ? (
          <div className="px-2 py-1">
            <p className="sr-only">Loading…</p>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                aria-hidden="true"
                className="relative mb-1.5 flex items-center gap-3 overflow-hidden rounded-lg border border-white/[0.04] px-3 py-3"
              >
                <span className="h-10 w-10 rounded-full bg-white/[0.05]" />
                <span className="flex-1 space-y-2">
                  <span className="block h-2.5 w-32 rounded-full bg-white/[0.06]" />
                  <span className="block h-2 w-20 rounded-full bg-white/[0.04]" />
                </span>
                <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)]" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && scans.length === 0 ? (
          <div className="mx-2 mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-ash"
            >
              <ClockIcon className="h-4 w-4" />
            </span>
            <p className="mx-auto mt-3 max-w-[18rem] text-xs leading-relaxed text-ash">
              No saved scans yet. Analyse a site and its report will appear here. Scans run in a
              private tab are never saved.
            </p>
          </div>
        ) : null}

        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {scans.map((scan, index) => {
              const privacyBand = BAND[scoreBand(scan.privacy.total)];
              const securityBand = BAND[scoreBand(scan.security.total)];
              return (
                <motion.li
                  key={scan.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: Math.min(index, 10) * 0.03, ease: EASE_OUT } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE_UI } }}
                  transition={{ duration: 0.2, ease: EASE_UI }}
                  className="group relative flex items-center gap-1 rounded-lg border border-transparent transition-colors duration-150 hover:border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(scan)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 pl-2.5 text-left"
                  >
                    {/* Decorative: the row text below states the same score. */}
                    <span aria-hidden="true">
                      <ScoreRing score={scan.privacy.total} label={`Privacy score for ${scan.domain}`} size={40}>
                        <span className={`technical tabular text-xs ${privacyBand.text}`}>{scan.privacy.total}</span>
                      </ScoreRing>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="technical truncate text-sm text-parchment transition-colors duration-150 group-hover:text-white">
                          {scan.domain}
                        </span>
                        {scan.monitored ? (
                          <span className="chip border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright">
                            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-verdigris-bright" />
                            monitored
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2.5 font-mono text-xs text-ash-dim">
                        <span>
                          Privacy <span className={privacyBand.text}>{scan.privacy.total}</span>
                        </span>
                        <span>
                          Security <span className={securityBand.text}>{scan.security.total}</span>
                        </span>
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ash-dim">
                        {relativeDay(scan.scannedAt)}
                      </span>
                    </span>
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ash-dim opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(scan.id)}
                    aria-label={`Delete the scan of ${scan.domain}`}
                    className="mr-1.5 shrink-0 rounded-md p-1.5 text-ash-dim opacity-0 transition-all duration-150 hover:bg-ember/10 hover:text-ember focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

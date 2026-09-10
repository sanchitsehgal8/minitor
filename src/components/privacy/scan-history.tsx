'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { TrashIcon } from '@/components/ui/icons';
import { scoreBand } from '@/lib/scan/privacy-score';
import type { StoredScan } from '@/lib/client/api-client';

const BAND_TEXT: Record<ReturnType<typeof scoreBand>, string> = {
  strong: 'text-verdigris',
  mixed: 'text-amber',
  poor: 'text-amber-dim',
};

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
}: {
  readonly scans: readonly StoredScan[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onOpen: (scan: StoredScan) => void;
  readonly onRemove: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-ink-edge px-3 py-3">
        <h3 className="font-body text-sm font-medium text-parchment">Scan history</h3>
        <p className="technical mt-1 text-xs text-ash-dim">
          {scans.length} {scans.length === 1 ? 'scan' : 'scans'} saved
        </p>
      </header>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <p role="alert" className="px-2 py-2 text-xs text-amber">
            {error}
          </p>
        ) : null}

        {isLoading && scans.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ash-dim">Loading…</p>
        ) : null}

        {!isLoading && scans.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-ash-dim">
            No saved scans yet. Analyse a site and its report will appear here. Scans run in a
            private tab are never saved.
          </p>
        ) : null}

        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {scans.map((scan) => (
              <motion.li
                key={scan.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="group flex items-start gap-1 rounded-md px-2 py-2 hover:bg-ink-raised"
              >
                <button type="button" onClick={() => onOpen(scan)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="technical truncate text-xs text-parchment">{scan.domain}</span>
                    {scan.monitored ? (
                      <span className="shrink-0 rounded-full border border-verdigris-dim px-1.5 py-0 font-mono text-xs text-verdigris">
                        monitored
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex gap-3">
                    <span className="font-mono text-xs text-ash-dim">
                      Privacy{' '}
                      <span className={BAND_TEXT[scoreBand(scan.privacy.total)]}>
                        {scan.privacy.total}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-ash-dim">
                      Security{' '}
                      <span className={BAND_TEXT[scoreBand(scan.security.total)]}>
                        {scan.security.total}
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-ash-dim">
                    {relativeDay(scan.scannedAt)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onRemove(scan.id)}
                  aria-label={`Delete the scan of ${scan.domain}`}
                  className="mt-0.5 shrink-0 rounded-sm p-1 text-ash-dim opacity-0 transition-opacity duration-150 hover:text-amber focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

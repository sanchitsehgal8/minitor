'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { EASE_OUT } from '@/components/privacy/privacy-primitives';
import { ScoreRing } from '@/components/privacy/score-dial';
import { ArrowRightIcon, LayersIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { compareScans, type ComparisonRow } from '@/lib/scan/comparison';
import type { StoredScan } from '@/lib/client/api-client';
import type { ScanResult } from '@/lib/scan/types';

/** Formats a row value according to its unit. */
function formatValue(row: ComparisonRow, side: 'left' | 'right'): string {
  const value = side === 'left' ? row.left : row.right;
  if (row.unit === 'percent') return `${value}%`;
  if (row.unit === 'score') return `${value}/100`;
  return String(value);
}

/**
 * Which side is the more private result for a row, or null when equal.
 * Highlighting per row rather than per site is deliberate: a site can lead on
 * trackers and trail on cookies, and the UI should not flatten that into a
 * winner (spec §12).
 */
function betterSide(row: ComparisonRow): 'left' | 'right' | null {
  if (row.left === row.right) return null;
  const leftLeads = row.higherIsBetter ? row.left > row.right : row.left < row.right;
  return leftLeads ? 'left' : 'right';
}

/** Bar length for a row value: scores and percentages on /100, counts on the pair's max. */
function barShare(row: ComparisonRow, value: number): number {
  const scale = row.unit === 'count' ? Math.max(1, row.left, row.right) : 100;
  return Math.max(0, Math.min(1, value / scale));
}

export function WebsiteComparison({
  scans,
  isLoading = false,
}: {
  readonly scans: readonly StoredScan[];
  readonly isLoading?: boolean;
}) {
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const prefersReducedMotion = usePrefersReducedMotion();

  const left = scans.find((scan) => scan.id === leftId) ?? null;
  const right = scans.find((scan) => scan.id === rightId) ?? null;

  const comparison = useMemo(
    () => (left && right ? compareScans(left, right) : null),
    [left, right],
  );

  const heading = (
    <div>
      <p className="eyebrow">Side by side</p>
      <h3 className="mt-1 font-display text-2xl leading-none text-parchment">Compare websites</h3>
    </div>
  );

  // Distinguish "still loading" from "genuinely nothing": the empty copy counts
  // saved scans, and rendering it mid-fetch told a user with ten stored scans
  // that they had none.
  if (isLoading && scans.length === 0) {
    return (
      <div className="p-4">
        {heading}
        <p className="mt-3 text-xs text-ash">Loading your saved scans…</p>
      </div>
    );
  }

  if (scans.length < 2) {
    return (
      <div className="p-4">
        {heading}
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-ash"
          >
            <LayersIcon className="h-4 w-4" />
          </span>
          <p className="mx-auto mt-3 max-w-[18rem] text-xs leading-relaxed text-ash">
            Analyse at least two websites to compare them. You have {scans.length}{' '}
            {scans.length === 1 ? 'saved scan' : 'saved scans'} so far.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {heading}
      <p className="mt-2 text-xs text-ash">Pick two scans to compare side by side.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SitePicker label="Site A" value={leftId} scans={scans} exclude={rightId} onChange={setLeftId} />
        <SitePicker label="Site B" value={rightId} scans={scans} exclude={leftId} onChange={setRightId} />
      </div>

      {comparison ? (
        <motion.div
          key={`${comparison.left.id}-${comparison.right.id}`}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          {/* Head to head: both privacy rings, domains underneath. */}
          <div className="surface relative mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 overflow-hidden px-3 py-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-verdigris-bright/40 to-transparent"
            />
            <SiteHead scan={comparison.left} badge="A" />
            <span aria-hidden="true" className="font-display text-xl italic text-ash-dim">
              vs
            </span>
            <SiteHead scan={comparison.right} badge="B" />
          </div>

          <ul className="mt-3 space-y-1">
            {comparison.rows.map((row, index) => {
              const better = betterSide(row);
              return (
                <li key={row.id} className="rounded-lg px-1 py-2.5">
                  <p className="text-center text-xs text-ash-light">{row.label}</p>
                  <div className="mt-2 grid grid-cols-2 items-center gap-1">
                    <PairedBar
                      side="left"
                      domain={comparison.left.domain}
                      value={formatValue(row, 'left')}
                      share={barShare(row, row.left)}
                      isBetter={better === 'left'}
                      delay={0.1 + index * 0.06}
                      animate={!prefersReducedMotion}
                    />
                    <PairedBar
                      side="right"
                      domain={comparison.right.domain}
                      value={formatValue(row, 'right')}
                      share={barShare(row, row.right)}
                      isBetter={better === 'right'}
                      delay={0.1 + index * 0.06}
                      animate={!prefersReducedMotion}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent px-4 py-3.5">
            <p className="eyebrow">Summary</p>
            <p className="mt-1.5 text-sm leading-relaxed text-parchment">{comparison.summary}</p>
          </div>
          <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-ash">
            <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-verdigris-bright" />
            Green marks the more private result for that row only. Neither site is better across the
            board.
          </p>
        </motion.div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] text-ash"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 -rotate-90" />
          </span>
          <p className="text-xs text-ash">Choose a scan for both sides to see a comparison.</p>
        </div>
      )}
    </div>
  );
}

function SiteHead({ scan, badge }: { readonly scan: ScanResult; readonly badge: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <ScoreRing score={scan.privacy.total} label={`Privacy score for ${scan.domain}`} size={64} />
      <p className="mt-2 flex max-w-full items-center gap-1.5">
        <span aria-hidden="true" className="chip border-white/[0.08] bg-white/[0.04] px-1.5 text-ash-light">
          {badge}
        </span>
        <span className="technical truncate text-xs text-parchment" title={scan.domain}>
          {scan.domain}
        </span>
      </p>
    </div>
  );
}

/**
 * One half of a row: the bar grows outward from the centre line, so the two
 * values meet in the middle and their lengths compare directly.
 */
function PairedBar({
  side,
  domain,
  value,
  share,
  isBetter,
  delay,
  animate,
}: {
  readonly side: 'left' | 'right';
  readonly domain: string;
  readonly value: string;
  readonly share: number;
  readonly isBetter: boolean;
  readonly delay: number;
  readonly animate: boolean;
}) {
  const isLeft = side === 'left';
  return (
    <div className={`flex items-center gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <span
        className={`technical tabular w-[52px] shrink-0 text-xs ${isLeft ? 'text-left' : 'text-right'} ${
          isBetter ? 'text-verdigris-bright' : 'text-parchment'
        }`}
      >
        <span className="sr-only">{domain}: </span>
        {value}
        {isBetter ? <span className="sr-only"> (more private)</span> : null}
      </span>
      <div className={`flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05] ${isLeft ? 'justify-end' : 'justify-start'}`}>
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundImage: isBetter
              ? `linear-gradient(${isLeft ? '270deg' : '90deg'}, #3E8E7E, #8AF0D6)`
              : 'linear-gradient(90deg, rgba(196,199,204,0.35), rgba(196,199,204,0.35))',
            boxShadow: isBetter ? '0 0 10px rgba(91,194,170,0.5)' : undefined,
          }}
          initial={animate ? { width: '0%' } : false}
          animate={{ width: `${Math.max(share * 100, share > 0 ? 3 : 0)}%` }}
          transition={{ duration: 0.8, delay, ease: EASE_OUT }}
        />
      </div>
    </div>
  );
}

function SitePicker({
  label,
  value,
  scans,
  exclude,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly scans: readonly StoredScan[];
  readonly exclude: string;
  readonly onChange: (id: string) => void;
}) {
  const id = `compare-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="eyebrow block">
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full cursor-pointer appearance-none truncate rounded-full border border-white/[0.08] bg-black/25 py-2 pl-3.5 pr-8 font-mono text-xs text-parchment transition-all duration-200 hover:border-white/[0.15] focus:border-verdigris-bright/60 focus:shadow-[0_0_0_4px_rgba(91,194,170,0.12)] focus:outline-none"
        >
          <option value="">Select a scan</option>
          {scans
            .filter((scan) => scan.id !== exclude)
            .map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.domain} — privacy {scan.privacy.total}
              </option>
            ))}
        </select>
        <ArrowRightIcon className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-ash" />
      </div>
    </div>
  );
}

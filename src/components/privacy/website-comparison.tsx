'use client';

import { useMemo, useState } from 'react';

import { compareScans, type ComparisonRow } from '@/lib/scan/comparison';
import type { StoredScan } from '@/lib/client/api-client';

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

export function WebsiteComparison({ scans }: { readonly scans: readonly StoredScan[] }) {
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const left = scans.find((scan) => scan.id === leftId) ?? null;
  const right = scans.find((scan) => scan.id === rightId) ?? null;

  const comparison = useMemo(
    () => (left && right ? compareScans(left, right) : null),
    [left, right],
  );

  if (scans.length < 2) {
    return (
      <div className="p-4">
        <h3 className="font-body text-sm font-medium text-parchment">Compare websites</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ash">
          Analyse at least two websites to compare them. You have {scans.length}{' '}
          {scans.length === 1 ? 'saved scan' : 'saved scans'} so far.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Compare websites</h3>
      <p className="mt-1 text-xs text-ash">Pick two scans to compare side by side.</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SitePicker label="Site A" value={leftId} scans={scans} exclude={rightId} onChange={setLeftId} />
        <SitePicker label="Site B" value={rightId} scans={scans} exclude={leftId} onChange={setRightId} />
      </div>

      {comparison ? (
        <>
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="pb-2 font-mono text-xs font-normal text-ash-dim">
                  Metric
                </th>
                <th scope="col" className="pb-2 font-mono text-xs font-normal text-ash-dim">
                  {comparison.left.domain}
                </th>
                <th scope="col" className="pb-2 font-mono text-xs font-normal text-ash-dim">
                  {comparison.right.domain}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => {
                const better = betterSide(row);
                return (
                  <tr key={row.id} className="border-t border-ink-edge">
                    <td className="py-2 pr-2 text-xs text-ash-light">{row.label}</td>
                    <td
                      className={`py-2 pr-2 font-mono text-xs ${better === 'left' ? 'text-verdigris' : 'text-parchment'}`}
                    >
                      {formatValue(row, 'left')}
                    </td>
                    <td
                      className={`py-2 font-mono text-xs ${better === 'right' ? 'text-verdigris' : 'text-parchment'}`}
                    >
                      {formatValue(row, 'right')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-3 rounded-md border border-ink-edge bg-ink px-3 py-2.5 text-xs leading-relaxed text-ash-light">
            {comparison.summary}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ash-dim">
            Green marks the more private result for that row only. Neither site is better across the
            board.
          </p>
        </>
      ) : (
        <p className="mt-4 text-xs text-ash-dim">Choose a scan for both sides to see a comparison.</p>
      )}
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
    <div>
      <label htmlFor={id} className="block text-xs text-ash-dim">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-ink-edge bg-ink px-2 py-1.5 font-mono text-xs text-parchment focus:border-verdigris focus:outline-none"
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
    </div>
  );
}

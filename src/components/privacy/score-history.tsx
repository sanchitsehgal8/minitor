'use client';

import { motion } from 'framer-motion';
import { useId, useState } from 'react';

import { CARD, CardHeader, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { ClockIcon, WarnIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { newTrackerDomains, privacyScoreDelta } from '@/lib/scan/comparison';
import type { StoredScan } from '@/lib/client/api-client';

/**
 * Privacy score across repeated scans of one site (spec §14).
 *
 * An area chart drawn from the scan list, oldest to newest, plus the delta
 * sentence and any tracker domains that were not present before. Hovering a
 * point reads out its score and date; the delta sentence carries the same
 * conclusion as text.
 */
export function ScoreHistory({ scans }: { readonly scans: readonly StoredScan[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<number | null>(null);

  // `scans` arrives newest-first from the API; chart oldest-first.
  const ordered = [...scans].reverse();

  if (ordered.length < 2) {
    return (
      <section className={CARD}>
        <CardHeader
          icon={<ClockIcon className="h-3.5 w-3.5" />}
          title="Score history"
          description="Only one scan of this site so far. Analyse it again later to see whether its privacy score changes."
        />
      </section>
    );
  }

  const previous = ordered[ordered.length - 2]!;
  const current = ordered[ordered.length - 1]!;
  const delta = privacyScoreDelta(previous, current);
  const added = newTrackerDomains(previous, current);

  const width = 320;
  const height = 110;
  const padX = 10;
  const padTop = 14;
  const padBottom = 12;
  const scores = ordered.map((scan) => scan.privacy.total);
  const min = Math.max(0, Math.min(...scores) - 8);
  const max = Math.min(100, Math.max(...scores) + 8);
  const span = Math.max(1, max - min);

  const points = ordered.map((scan, index) => ({
    x: padX + (index / Math.max(1, ordered.length - 1)) * (width - padX * 2),
    y: height - padBottom - ((scan.privacy.total - min) / span) * (height - padTop - padBottom),
    scan,
  }));

  // Smooth but never overshooting: control points sit at the horizontal
  // midpoint, level with each end, so the curve stays between neighbours.
  const line = points
    .map((point, index) => {
      if (index === 0) return `M${point.x},${point.y}`;
      const prev = points[index - 1]!;
      const mid = (prev.x + point.x) / 2;
      return `C${mid},${prev.y} ${mid},${point.y} ${point.x},${point.y}`;
    })
    .join(' ');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${line} L${last.x},${height} L${first.x},${height} Z`;

  const deltaStyle =
    delta.direction === 'down'
      ? 'border-amber/30 bg-amber/10 text-amber'
      : delta.direction === 'up'
        ? 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright'
        : 'border-white/[0.08] bg-white/[0.03] text-ash-light';
  const focus = hovered !== null ? points[hovered] : null;

  return (
    <section className={CARD}>
      <CardHeader
        icon={<ClockIcon className="h-3.5 w-3.5" />}
        title="Score history"
        description={
          <>
            {ordered.length} scans of {current.domain}
          </>
        }
        aside={
          <span className={`chip tabular ${deltaStyle}`} aria-hidden="true">
            {delta.points > 0 ? '+' : delta.points < 0 ? '−' : '±'}
            {Math.abs(delta.points)}
          </span>
        }
      />

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Privacy score across ${ordered.length} scans, currently ${current.privacy.total}`}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={`history-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BC2AA" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#5BC2AA" stopOpacity="0" />
            </linearGradient>
            {/* User-space units: a flat line has a zero-height bounding box,
                which makes a bounding-box gradient (and so the stroke) vanish. */}
            <linearGradient
              id={`history-line-${uid}`}
              gradientUnits="userSpaceOnUse"
              x1={padX}
              y1={0}
              x2={width - padX}
              y2={0}
            >
              <stop offset="0%" stopColor="#3E8E7E" />
              <stop offset="100%" stopColor="#8AF0D6" />
            </linearGradient>
          </defs>

          {/* Recessive guides at the plotted range's top and bottom. */}
          {[max, min].map((value) => {
            const y = height - padBottom - ((value - min) / span) * (height - padTop - padBottom);
            return (
              <g key={value}>
                <line x1={0} x2={width} y1={y} y2={y} stroke="#FFFFFF" strokeOpacity={0.05} strokeDasharray="2 4" />
                <text x={width} y={y - 3} textAnchor="end" className="font-mono" style={{ fontSize: 8, fill: '#5D636D' }}>
                  {value}
                </text>
              </g>
            );
          })}

          <motion.path
            d={area}
            fill={`url(#history-fill-${uid})`}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE_OUT }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={`url(#history-line-${uid})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(91,194,170,0.45))' }}
          />

          {focus ? (
            <line x1={focus.x} x2={focus.x} y1={0} y2={height} stroke="#ECE8E1" strokeOpacity={0.2} />
          ) : null}

          {points.map((point, index) => {
            const isLast = index === points.length - 1;
            return (
              <g key={point.scan.id}>
                {isLast && !prefersReducedMotion ? (
                  <motion.circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill="none"
                    stroke="#8AF0D6"
                    strokeWidth="1.2"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1.1 }}
                  />
                ) : null}
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 4 : hovered === index ? 3.5 : 2.5}
                  fill={isLast ? '#8AF0D6' : '#0B0E13'}
                  stroke="#5BC2AA"
                  strokeWidth="1.5"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + (index / points.length) * 0.8 }}
                />
                {/* Hit target wider than the mark. */}
                <rect
                  x={point.x - (width / points.length) / 2}
                  y={0}
                  width={width / points.length}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                />
              </g>
            );
          })}
        </svg>

        {focus ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/[0.1] bg-ink-raised/95 px-2 py-1 font-mono text-xs text-parchment shadow-lift backdrop-blur-md"
            style={{
              left: `${Math.min(88, Math.max(12, (focus.x / width) * 100))}%`,
            }}
          >
            <span className="text-white">{focus.scan.privacy.total}</span>
            <span className="text-ash"> · {new Date(focus.scan.scannedAt).toLocaleDateString('en-GB')}</span>
          </div>
        ) : null}
      </div>

      <p
        className={`mt-3 text-xs ${
          delta.direction === 'down'
            ? 'text-amber'
            : delta.direction === 'up'
              ? 'text-verdigris-bright'
              : 'text-ash-light'
        }`}
      >
        {delta.sentence}
      </p>

      {added.length > 0 ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="eyebrow flex items-center gap-1.5 text-amber">
            <WarnIcon className="h-3 w-3" />
            Newly observed tracker {added.length === 1 ? 'domain' : 'domains'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {added.map((domain) => (
              <li key={domain} className="chip technical border-amber/25 bg-amber/[0.08] text-amber">
                {domain}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

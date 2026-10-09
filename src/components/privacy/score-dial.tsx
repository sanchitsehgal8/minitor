'use client';

import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { BAND, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { scoreBand } from '@/lib/scan/privacy-score';

/**
 * A score as a ring. Presentational only — the number and its band arrive
 * already computed by the scoring service.
 *
 * The arc draws from zero to the score with a bright head travelling ahead of
 * it, over a ring of tick marks; colour follows the band. The visible number is
 * decorative (`aria-hidden`) because the SVG's label already states it.
 */
export function ScoreRing({
  score,
  label,
  size,
  children,
}: {
  readonly score: number;
  readonly label: string;
  readonly size: number;
  /** Optional centre content; defaults to the counting score. */
  readonly children?: ReactNode;
}) {
  const band = BAND[scoreBand(score)];
  const prefersReducedMotion = usePrefersReducedMotion();
  // useId yields ':r1:'-style ids; colons break `url(#…)` references.
  const uid = useId().replace(/:/g, '');

  const isLarge = size >= 72;
  const stroke = isLarge ? Math.max(5, size * 0.055) : Math.max(3, size * 0.09);
  const tickSpace = isLarge ? 9 : 0;
  const radius = size / 2 - stroke / 2 - tickSpace - 2;
  const centre = size / 2;
  const target = Math.max(0, Math.min(100, score)) / 100;

  // Starts when the dial scrolls into view, with the same trigger as the
  // counting number inside it, so arc and digits land together.
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  // Starts empty on every render path (server included); the effect below
  // fills it, instantly under reduced motion.
  const progress = useMotionValue(0);
  useEffect(() => {
    if (prefersReducedMotion) {
      progress.set(target);
      return;
    }
    if (!isInView) return;
    const controls = animate(progress, target, { duration: 1.5, ease: EASE_OUT });
    return () => controls.stop();
  }, [progress, target, prefersReducedMotion, isInView]);

  // The arc starts at 12 o'clock, so the head sits at angle −90° + progress·360°.
  const headX = useTransform(progress, (p) => centre + Math.cos(p * Math.PI * 2 - Math.PI / 2) * radius);
  const headY = useTransform(progress, (p) => centre + Math.sin(p * Math.PI * 2 - Math.PI / 2) * radius);
  const headOpacity = useTransform(progress, [0, 0.02], [0, 1]);

  const ticks = isLarge ? 60 : 0;
  const tickOuter = size / 2 - 1.5;

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Soft halo in the band colour, so the dial reads as lit from within. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[12%] rounded-full blur-2xl"
        style={{ background: band.glow, opacity: isLarge ? 0.28 : 0.18 }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${score} out of 100`}
        className="relative overflow-visible"
      >
        <defs>
          <linearGradient id={`dial-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={band.to} />
            <stop offset="100%" stopColor={band.from} />
          </linearGradient>
          <filter id={`dial-glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isLarge ? 3.5 : 2} />
          </filter>
        </defs>

        {Array.from({ length: ticks }, (_, index) => {
          const angle = (index / ticks) * Math.PI * 2 - Math.PI / 2;
          const isMajor = index % 5 === 0;
          const inner = tickOuter - (isMajor ? 5 : 3);
          const lit = index / ticks < target;
          return (
            <line
              key={index}
              x1={centre + Math.cos(angle) * inner}
              y1={centre + Math.sin(angle) * inner}
              x2={centre + Math.cos(angle) * tickOuter}
              y2={centre + Math.sin(angle) * tickOuter}
              stroke={lit ? band.to : '#FFFFFF'}
              strokeOpacity={lit ? (isMajor ? 0.55 : 0.3) : isMajor ? 0.14 : 0.07}
              strokeWidth={isMajor ? 1.2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.06}
          strokeWidth={stroke}
        />

        <g transform={`rotate(-90 ${centre} ${centre})`}>
          {/* Blurred copy underneath: the glow follows the arc exactly. */}
          <motion.circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={`url(#dial-grad-${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            filter={`url(#dial-glow-${uid})`}
            opacity={0.7}
            style={{ pathLength: progress }}
          />
          <motion.circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={`url(#dial-grad-${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{ pathLength: progress }}
          />
        </g>

        <motion.circle
          cx={headX}
          cy={headY}
          r={stroke * 0.42}
          fill="#FFFFFF"
          style={{ opacity: headOpacity }}
          filter={`url(#dial-glow-${uid})`}
        />
        <motion.circle cx={headX} cy={headY} r={stroke * 0.3} fill="#FFFFFF" style={{ opacity: headOpacity }} />
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="font-display leading-none text-white" style={{ fontSize: size * 0.36 }}>
            <AnimatedNumber value={score} duration={1.5} format={(value) => String(Math.round(value))} />
          </span>
        )}
      </div>
    </div>
  );
}

export function ScoreDial({
  score,
  label,
  size = 84,
}: {
  readonly score: number;
  readonly label: string;
  readonly size?: number;
}) {
  const band = BAND[scoreBand(score)];

  return (
    <div className="flex items-center gap-5">
      <ScoreRing score={score} label={label} size={size} />

      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className={`mt-1 font-display text-2xl leading-none ${band.text}`}>{band.label}</p>
        <p className="technical mt-2 text-xs text-ash">
          <span className="tabular text-parchment">{score}</span> / 100
        </p>
      </div>
    </div>
  );
}

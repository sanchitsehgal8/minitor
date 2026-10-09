'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { scoreBand } from '@/lib/scan/privacy-score';
import type { RequestCategory } from '@/lib/scan/types';

/**
 * Shared visual vocabulary for the Privacy Center.
 *
 * Seventeen components render one report; keeping their easing, band colours
 * and card anatomy in one place is what makes them read as a single surface
 * rather than seventeen. Presentational only — nothing here computes data.
 */

/** Entrances and draws: fast out, long settle. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** UI state changes: decisive, no overshoot. */
export const EASE_UI = [0.32, 0.72, 0, 1] as const;
/** Sliding indicators and layout shifts. */
export const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

export type Band = ReturnType<typeof scoreBand>;

/**
 * Colour per score band. Strong reads as "protected" (verdigris), mixed as
 * caution (amber), and only the poorest band reaches for ember.
 */
export const BAND: Readonly<
  Record<
    Band,
    {
      readonly label: string;
      readonly text: string;
      readonly chip: string;
      /** Gradient stops for strokes and fills, low end first. */
      readonly from: string;
      readonly to: string;
      readonly glow: string;
    }
  >
> = {
  strong: {
    label: 'Strong',
    text: 'text-verdigris-bright',
    chip: 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright',
    from: '#3E8E7E',
    to: '#8AF0D6',
    glow: 'rgba(91, 194, 170, 0.5)',
  },
  mixed: {
    label: 'Mixed',
    text: 'text-amber',
    chip: 'border-amber/25 bg-amber/10 text-amber',
    from: '#A87A33',
    to: '#F5C46B',
    glow: 'rgba(216, 162, 74, 0.5)',
  },
  poor: {
    label: 'Poor',
    text: 'text-ember',
    chip: 'border-ember/25 bg-ember/10 text-ember',
    from: '#A9523C',
    to: '#E0775A',
    glow: 'rgba(224, 119, 90, 0.5)',
  },
};

/**
 * One colour per request category, shared by the graph, the request table and
 * the category bars so a domain keeps its colour across every view.
 *
 * Site-owned traffic is verdigris and neutral infrastructure is ash; the four
 * tracking categories sit in the amber/ember family, ordered so neighbours in
 * a stacked bar (analytics → advertising → social → fingerprinting) alternate
 * light and dark and stay distinguishable. Colour is never the only cue —
 * every use carries a text label beside it.
 */
export const CATEGORY_COLOR: Readonly<Record<RequestCategory, string>> = {
  content: '#5BC2AA',
  functional: '#5BC2AA',
  cdn: '#8A8F98',
  analytics: '#D8A24A',
  advertising: '#A9523C',
  social: '#F5C46B',
  fingerprinting: '#E0775A',
};

/** Card heading: an icon tile, a title, an optional line and a right slot. */
export function CardHeader({
  icon,
  title,
  description,
  aside,
  tone = 'neutral',
}: {
  readonly icon?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly aside?: ReactNode;
  readonly tone?: 'neutral' | 'good' | 'caution';
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? <IconTile tone={tone}>{icon}</IconTile> : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 items-center justify-between gap-3">
          <h3
            className={`font-body text-sm font-medium tracking-[-0.005em] ${
              tone === 'good' ? 'text-verdigris-bright' : tone === 'caution' ? 'text-amber' : 'text-parchment'
            }`}
          >
            {title}
          </h3>
          {aside}
        </div>
        {description ? <div className="mt-0.5 text-xs leading-relaxed text-ash">{description}</div> : null}
      </div>
    </div>
  );
}

export function IconTile({
  children,
  tone = 'neutral',
}: {
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'good' | 'caution';
}) {
  const style =
    tone === 'good'
      ? 'border-verdigris-bright/20 bg-verdigris-bright/10 text-verdigris-bright'
      : tone === 'caution'
        ? 'border-amber/25 bg-amber/10 text-amber'
        : 'border-white/[0.07] bg-white/[0.04] text-ash-light';
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${style}`}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {children}
    </span>
  );
}

/**
 * A horizontal measure that grows to its value. Width rather than scaleX so
 * the rounded end keeps its shape at small values; under reduced motion it
 * simply renders at its final width.
 */
export function Meter({
  value,
  from,
  to,
  delay = 0,
  className = 'h-1.5',
}: {
  /** 0–100. */
  readonly value: number;
  readonly from: string;
  readonly to: string;
  readonly delay?: number;
  readonly className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
          boxShadow: `0 0 10px -1px ${to}66`,
        }}
        initial={prefersReducedMotion ? false : { width: '0%' }}
        animate={{ width }}
        transition={{ duration: 0.9, delay, ease: EASE_OUT }}
      />
    </div>
  );
}

/** Staggered entrance for a column of cards. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_UI } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

/** The card shell every report section sits in. */
export const CARD = 'surface relative overflow-hidden p-4';

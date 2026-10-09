'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CARD,
  CATEGORY_COLOR,
  CardHeader,
  EASE_OUT,
  EASE_UI,
  IconTile,
} from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { CloseIcon, GlobeIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { ConnectionGraph, GraphNode, RequestCategory } from '@/lib/scan/types';

const CATEGORY_LABEL: Record<RequestCategory, string> = {
  content: 'Site content',
  functional: 'Site assets',
  cdn: 'CDN / assets',
  analytics: 'Analytics',
  advertising: 'Advertising',
  social: 'Social',
  fingerprinting: 'Fingerprinting',
};

/** Legend order; only categories present in the drawn nodes are listed. */
const LEGEND_ORDER: readonly RequestCategory[] = [
  'analytics',
  'advertising',
  'social',
  'fingerprinting',
  'cdn',
  'functional',
];

const MAX_NODES = 14;

// Geometry, in viewBox units. The viewBox is close to the panel's own width so
// labels render near their nominal size instead of being scaled down to dust.
const WIDTH = 400;
const HEIGHT = 300;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
// Sized so a 14-character label beside a node at either end of the ring
// still fits inside the viewBox.
const RX = 106;
const RY = 100;
const ROOT_R = 33;

/**
 * Website connections as a radial graph (spec §7).
 *
 * Hand-drawn SVG rather than a graph library: the layout is a single ring
 * around one root, which is a few lines of trigonometry — pulling in a force
 * simulation would add a dependency and non-deterministic positions for no
 * gain. Node placement is derived from the index, so it is stable across
 * renders. The ring is an ellipse because the panel is wider than it is tall,
 * and labels sit radially outward so neighbours do not collide.
 */
export function DomainGraph({
  graph,
  selectedDomain,
  onSelectDomain,
}: {
  readonly graph: ConnectionGraph;
  readonly selectedDomain: string | null;
  readonly onSelectDomain: (domain: string) => void;
}) {
  const nodes = useMemo(() => graph.nodes.slice(0, MAX_NODES), [graph.nodes]);
  const hidden = graph.nodes.length - nodes.length;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const positioned = useMemo(
    () =>
      nodes.map((node, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        const x = CX + Math.cos(angle) * RX;
        const y = CY + Math.sin(angle) * RY;
        // Quadratic edge bowed to one side, so the spokes read as a swirl
        // rather than a starburst. The bow is proportional to length.
        const mx = (CX + x) / 2;
        const my = (CY + y) / 2;
        const dx = x - CX;
        const dy = y - CY;
        const length = Math.hypot(dx, dy) || 1;
        const bow = length * 0.16;
        const qx = mx + (-dy / length) * bow;
        const qy = my + (dx / length) * bow;
        return {
          node,
          index,
          angle,
          x,
          y,
          size: Math.min(11, 5 + node.requests * 0.7),
          path: `M${CX},${CY} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`,
        };
      }),
    [nodes],
  );

  const legend = useMemo(() => {
    const present = new Set(nodes.map((node) => node.category));
    return LEGEND_ORDER.filter((category) => present.has(category));
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <section className={CARD}>
        <CardHeader
          icon={<GlobeIcon className="h-3.5 w-3.5" />}
          title="Website connections"
          description={`This scan observed no third-party connections — every request stayed on ${graph.root}.`}
        />
      </section>
    );
  }

  const active = hovered ?? focused ?? selectedDomain;
  // Hover and focus dim the rest strongly; a standing selection only softly,
  // so the graph stays readable while a domain is open.
  const isPointing = hovered !== null || focused !== null;
  const rootLabel = graph.root.length > 13 ? `${graph.root.slice(0, 12)}…` : graph.root;

  return (
    <section className={CARD}>
      <CardHeader
        icon={<GlobeIcon className="h-3.5 w-3.5" />}
        title="Website connections"
        description={
          <>
            Domains contacted while loading {graph.root}. Select one for details.
            {hidden > 0 ? ` Showing the ${MAX_NODES} busiest of ${graph.nodes.length}.` : ''}
          </>
        }
      />

      <div className="relative -mx-4 mt-3 overflow-hidden border-y border-white/[0.05] bg-ink-sunken/60">
        {/*
          `role="group"`, not `role="img"`: an image role collapses the whole
          subtree into one opaque label, which hid every focusable node button
          inside from assistive technology. The list below the graph carries the
          same data as text, so nothing is graph-only.
        */}
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full"
          role="group"
          aria-label={`Connection graph for ${graph.root}, ${nodes.length} third-party domains shown`}
        >
          <defs>
            <radialGradient id="graph-backdrop" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#3E8E7E" stopOpacity="0.2" />
              <stop offset="55%" stopColor="#3E8E7E" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#3E8E7E" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="graph-root" cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#1A2A28" />
              <stop offset="100%" stopColor="#0B0E13" />
            </radialGradient>
            <radialGradient id="graph-sheen" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <filter id="graph-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Backdrop: light pooling at the root and faint orbits. */}
          <rect width={WIDTH} height={HEIGHT} fill="url(#graph-backdrop)" />
          <ellipse cx={CX} cy={CY} rx={RX * 0.52} ry={RY * 0.52} fill="none" stroke="#FFFFFF" strokeOpacity={0.05} />
          {/* Keyed on the preference: it resolves after mount, and a remount is
              what reliably stops a repeating animation that already started. */}
          <motion.ellipse
            key={prefersReducedMotion ? 'orbit-still' : 'orbit-flow'}
            cx={CX}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke="#5BC2AA"
            strokeOpacity={0.14}
            strokeDasharray="1 5"
            strokeLinecap="round"
            animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -60] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          <ellipse cx={CX} cy={CY} rx={RX * 1.42} ry={RY * 1.42} fill="none" stroke="#FFFFFF" strokeOpacity={0.035} />

          {/* Edges. Blocked ones carry a flowing dash that stops at the node. */}
          {positioned.map(({ node, index, path }) => {
            const isBlocked = node.action === 'block';
            const isActive = active === node.domain;
            const dim = active !== null && !isActive;
            return (
              <g
                key={`edge-${node.domain}`}
                style={{ opacity: dim ? (isPointing ? 0.25 : 0.5) : 1, transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1)' }}
              >
                <motion.path
                  d={path}
                  fill="none"
                  stroke={isBlocked ? '#D8A24A' : isActive ? '#ECE8E1' : '#FFFFFF'}
                  strokeOpacity={isBlocked ? 0.22 : isActive ? 0.6 : 0.12}
                  strokeWidth={isActive ? 1.6 : 1}
                  strokeLinecap="round"
                  initial={prefersReducedMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.05 + index * 0.03, ease: EASE_OUT }}
                />
                {isBlocked ? (
                  <motion.path
                    key={prefersReducedMotion ? 'still' : 'flow'}
                    d={path}
                    fill="none"
                    stroke="#F5C46B"
                    strokeOpacity={isActive ? 1 : 0.75}
                    strokeWidth={isActive ? 1.8 : 1.3}
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { opacity: 1, strokeDashoffset: [0, -14] }
                    }
                    transition={{
                      opacity: { duration: 0.4, delay: 0.7 + index * 0.03 },
                      strokeDashoffset: { duration: 0.9, repeat: Infinity, ease: 'linear' },
                    }}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Root: the scanned site, with a slow halo. */}
          <g aria-hidden="true">
            {prefersReducedMotion ? null : (
              <motion.circle
                cx={CX}
                cy={CY}
                r={ROOT_R}
                fill="none"
                stroke="#5BC2AA"
                strokeWidth="1"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <motion.g
              initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <circle cx={CX} cy={CY} r={ROOT_R} fill="url(#graph-root)" stroke="#5BC2AA" strokeWidth="1.4" filter="url(#graph-glow)" />
              <circle cx={CX} cy={CY} r={ROOT_R - 5} fill="none" stroke="#FFFFFF" strokeOpacity={0.07} />
              <text
                x={CX}
                y={CY - 6}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono"
                style={{ fontSize: 6, letterSpacing: '0.18em', fill: '#5BC2AA' }}
              >
                SITE
              </text>
              <text
                x={CX}
                y={CY + 5}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono"
                style={{ fontSize: 8, fill: '#ECE8E1' }}
              >
                {rootLabel}
              </text>
            </motion.g>
          </g>

          {positioned.map(({ node, index, x, y, size, angle }) => {
            const isSelected = node.domain === selectedDomain;
            const isActive = active === node.domain;
            const dim = active !== null && !isActive && !isSelected;
            const dimOpacity = isPointing ? 0.4 : 0.65;
            const isBlocked = node.action === 'block';
            const color = CATEGORY_COLOR[node.category];
            const label = labelPlacement(angle, x, y, size);
            return (
              <g
                key={node.domain}
                onClick={() => onSelectDomain(node.domain)}
                onMouseEnter={() => setHovered(node.domain)}
                onMouseLeave={() => setHovered((current) => (current === node.domain ? null : current))}
                onFocus={() => setFocused(node.domain)}
                onBlur={() => setFocused((current) => (current === node.domain ? null : current))}
                className="cursor-pointer"
                // The ring drawn below is the focus indicator; the default
                // outline would box the label as well as the node.
                style={{
                  outline: 'none',
                  opacity: dim ? dimOpacity : 1,
                  transition: 'opacity 200ms cubic-bezier(0.32,0.72,0,1)',
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${node.domain}, ${node.requests} requests, ${node.action === 'block' ? 'blocked' : 'allowed'}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectDomain(node.domain);
                  }
                }}
              >
                {/* Generous invisible hit target around small nodes. */}
                <circle cx={x} cy={y} r={Math.max(16, size + 8)} fill="transparent" />

                <motion.g
                  initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.25 + index * 0.035 }}
                >
                  {isSelected || focused === node.domain ? (
                    <circle cx={x} cy={y} r={size + 6} fill="none" stroke="#F7F5F1" strokeWidth="1.5" />
                  ) : null}
                  {isBlocked ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 3}
                      fill="none"
                      stroke="#F5C46B"
                      strokeOpacity={0.55}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={size}
                    fill={color}
                    fillOpacity={isBlocked ? 1 : 0.8}
                    filter={isActive || isSelected ? 'url(#graph-glow)' : undefined}
                  />
                  <circle cx={x} cy={y} r={size} fill="url(#graph-sheen)" />
                </motion.g>

                <motion.text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  dominantBaseline="central"
                  className="font-mono"
                  style={{
                    fontSize: 8.5,
                    fill: isActive || isSelected ? '#F7F5F1' : '#9DA2AA',
                    transition: 'fill 200ms',
                  }}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.45 + index * 0.035 }}
                >
                  {shortLabel(node.domain)}
                </motion.text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {legend.map((category) => (
          <li key={category} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR[category], boxShadow: `0 0 6px ${CATEGORY_COLOR[category]}` }}
            />
            <span className="text-xs text-ash">{CATEGORY_LABEL[category]}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="18" height="6" viewBox="0 0 18 6">
            <path d="M1 3h16" stroke="#F5C46B" strokeWidth="1.4" strokeDasharray="2 3" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-ash">Blocked</span>
        </li>
      </ul>
    </section>
  );
}

/**
 * Where a node's label goes: radially outward. Nodes on the sides anchor
 * their text away from the centre; nodes near the top and bottom centre it
 * above or below, which is where the ellipse leaves room.
 */
function labelPlacement(angle: number, x: number, y: number, size: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const gap = size + 7;
  if (cos > 0.38) return { x: x + gap, y, anchor: 'start' as const };
  if (cos < -0.38) return { x: x - gap, y, anchor: 'end' as const };
  return { x, y: sin < 0 ? y - gap - 1 : y + gap + 1, anchor: 'middle' as const };
}

/**
 * A label that fits beside a node. Leading subdomains go first, since the
 * registrable part is what identifies the operator; only then is the end cut.
 * The node's accessible name and the detail card always carry the full domain.
 */
function shortLabel(domain: string): string {
  const max = 14;
  let labels = domain.replace(/^www\./, '').split('.');
  while (labels.join('.').length > max && labels.length > 2) labels = labels.slice(1);
  const trimmed = labels.join('.');
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * Detail panel for a selected graph node or table row. A motion element with
 * its own enter/exit, so a parent `AnimatePresence` can open and close it.
 */
export function DomainDetail({
  node,
  onClose,
}: {
  readonly node: GraphNode;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const isBlocked = node.action === 'block';
  const color = CATEGORY_COLOR[node.category];

  // A selection made far down a list opens this card higher up; bring it into
  // view rather than leaving the result of the click off-screen.
  // Waits for the open animation so the measured height is the final one.
  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 340);
    return () => clearTimeout(timer);
  }, [node.domain]);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.32, ease: EASE_UI }}
      className="overflow-hidden"
    >
      <div
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-ink-raised p-4"
        style={{ borderColor: `${color}40`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl"
          style={{ background: color, opacity: 0.16 }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            </IconTile>
            <div className="min-w-0">
              <p className="eyebrow">Domain</p>
              <p className="technical truncate text-sm text-white" title={node.domain}>
                {node.domain}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="chrome-button h-7 w-7 shrink-0"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <dl className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="surface-inset px-3 py-2.5">
            <dt className="eyebrow">Category</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-xs text-parchment">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {CATEGORY_LABEL[node.category]}
            </dd>
          </div>
          <div className="surface-inset px-3 py-2.5">
            <dt className="eyebrow">Requests</dt>
            <dd className="mt-0.5 font-display text-2xl leading-none text-white">
              <AnimatedNumber value={node.requests} duration={0.8} />
            </dd>
          </div>
          <div className="surface-inset px-3 py-2.5">
            <dt className="eyebrow">First-party</dt>
            <dd className="technical mt-1 text-xs text-parchment">{node.firstParty ? 'Yes' : 'No'}</dd>
          </div>
          <div className="surface-inset px-3 py-2.5">
            <dt className="eyebrow">MiniTor action</dt>
            <dd className="mt-1">
              <span
                className={`chip ${
                  isBlocked
                    ? 'border-amber/30 bg-amber/10 text-amber'
                    : 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright'
                }`}
              >
                <span aria-hidden="true" className={`h-1 w-1 rounded-full ${isBlocked ? 'bg-amber' : 'bg-verdigris-bright'}`} />
                {isBlocked ? 'BLOCKED' : 'ALLOWED'}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </motion.section>
  );
}

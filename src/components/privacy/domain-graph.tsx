'use client';

import { useMemo } from 'react';

import type { ConnectionGraph, GraphNode, RequestCategory } from '@/lib/scan/types';

const CATEGORY_COLOR: Record<RequestCategory, string> = {
  content: '#3E8E7E',
  functional: '#3E8E7E',
  cdn: '#8A8F98',
  analytics: '#D8A24A',
  advertising: '#A87A33',
  social: '#D8A24A',
  fingerprinting: '#A87A33',
};

const CATEGORY_LABEL: Record<RequestCategory, string> = {
  content: 'Site content',
  functional: 'Site assets',
  cdn: 'CDN / assets',
  analytics: 'Analytics',
  advertising: 'Advertising',
  social: 'Social',
  fingerprinting: 'Fingerprinting',
};

const MAX_NODES = 14;

/**
 * Website connections as a radial graph (spec §7).
 *
 * Hand-drawn SVG rather than a graph library: the layout is a single ring
 * around one root, which is a few lines of trigonometry — pulling in a force
 * simulation would add a dependency and non-deterministic positions for no
 * gain. Node placement is derived from the index, so it is stable across
 * renders.
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

  const width = 520;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 118;

  const positioned = nodes.map((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    return {
      node,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  if (nodes.length === 0) {
    return (
      <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
        <h3 className="font-body text-sm font-medium text-parchment">Website connections</h3>
        <p className="mt-1.5 text-xs text-ash">
          This scan observed no third-party connections — every request stayed on {graph.root}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Website connections</h3>
      <p className="mt-1 text-xs text-ash">
        Domains contacted while loading {graph.root}. Select one for details.
        {hidden > 0 ? ` Showing the ${MAX_NODES} busiest of ${graph.nodes.length}.` : ''}
      </p>

      <div className="log-scroll mt-3 overflow-x-auto">
        {/*
          `role="group"`, not `role="img"`: an image role collapses the whole
          subtree into one opaque label, which hid every focusable node button
          inside from assistive technology. The list below the graph carries the
          same data as text, so nothing is graph-only.
        */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[420px]"
          role="group"
          aria-label={`Connection graph for ${graph.root}, ${nodes.length} third-party domains shown`}
        >
          {positioned.map(({ node, x, y }) => (
            <line
              key={`edge-${node.domain}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={node.action === 'block' ? '#A87A33' : '#252A35'}
              strokeWidth={node.action === 'block' ? 1.4 : 1}
              strokeDasharray={node.action === 'block' ? '3 3' : undefined}
            />
          ))}

          <circle cx={cx} cy={cy} r={34} fill="#12151C" stroke="#3E8E7E" strokeWidth="1.6" />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-parchment font-mono"
            style={{ fontSize: 9 }}
          >
            {graph.root.length > 14 ? `${graph.root.slice(0, 13)}…` : graph.root}
          </text>

          {positioned.map(({ node, x, y }) => {
            const isSelected = node.domain === selectedDomain;
            const size = Math.min(11, 5 + node.requests * 0.7);
            return (
              <g
                key={node.domain}
                onClick={() => onSelectDomain(node.domain)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${node.domain}, ${node.requests} requests, ${node.action === 'block' ? 'blocked' : 'allowed'}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectDomain(node.domain);
                  }
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={CATEGORY_COLOR[node.category]}
                  stroke={isSelected ? '#F7F5F1' : 'transparent'}
                  strokeWidth="2"
                  opacity={node.action === 'block' ? 1 : 0.75}
                />
                <text
                  x={x}
                  y={y + size + 9}
                  textAnchor="middle"
                  className="fill-current font-mono"
                  style={{ fontSize: 7.5, fill: isSelected ? '#F7F5F1' : '#8A8F98' }}
                >
                  {shortLabel(node.domain)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-edge pt-3">
        {(['analytics', 'advertising', 'social', 'cdn'] as const).map((category) => (
          <li key={category} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR[category] }}
            />
            <span className="text-xs text-ash-dim">{CATEGORY_LABEL[category]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function shortLabel(domain: string): string {
  const trimmed = domain.replace(/^www\./, '');
  return trimmed.length > 16 ? `${trimmed.slice(0, 15)}…` : trimmed;
}

/** Detail panel for a selected graph node or table row. */
export function DomainDetail({
  node,
  onClose,
}: {
  readonly node: GraphNode;
  readonly onClose: () => void;
}) {
  const rows: readonly { label: string; value: string }[] = [
    { label: 'Category', value: CATEGORY_LABEL[node.category] },
    { label: 'Requests', value: String(node.requests) },
    { label: 'First-party', value: node.firstParty ? 'Yes' : 'No' },
    { label: 'MiniTor action', value: node.action === 'block' ? 'BLOCKED' : 'ALLOWED' },
  ];

  return (
    <section className="rounded-lg border border-verdigris-dim bg-ink p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ash-dim">Domain</p>
          <p className="technical truncate text-sm text-parchment">{node.domain}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xs text-ash transition-colors duration-150 hover:text-parchment"
        >
          Close
        </button>
      </div>

      <dl className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-ash-dim">{row.label}</dt>
            <dd
              className={`technical shrink-0 text-xs ${
                row.label === 'MiniTor action' && node.action === 'block'
                  ? 'text-amber'
                  : 'text-parchment'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

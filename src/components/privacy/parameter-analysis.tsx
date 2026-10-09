'use client';

import { motion } from 'framer-motion';

import { CARD, CardHeader, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { CheckIcon, SearchIcon, WarnIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  PARAMETER_CATEGORY_LABEL,
  stripTrackingParameters,
  type ParameterFinding,
} from '@/lib/scan/tracking-parameters';

/**
 * Tracking parameters found in the observed URLs (spec §4).
 *
 * Separate from the tracker table because the remedy differs: these are not
 * requests to block, they are identifiers carried inside a URL the user may
 * paste or share.
 */
export function ParameterAnalysis({
  parameters,
  sampleUrl,
}: {
  readonly parameters: readonly ParameterFinding[];
  /** A URL from the scan carrying parameters, to show the stripped form. */
  readonly sampleUrl: string | null;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (parameters.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-verdigris-bright/20 bg-verdigris-bright/[0.05] p-4">
        <CardHeader
          tone="good"
          icon={<CheckIcon className="h-3.5 w-3.5" />}
          title="No tracking parameters"
          description={
            <span className="text-ash-light">
              No known campaign or click-identifier parameters appeared in the URLs observed in this
              scan.
            </span>
          }
        />
      </section>
    );
  }

  const clickIds = parameters.filter((parameter) => parameter.category === 'click-id');
  const keys = new Set(parameters.map((parameter) => parameter.key));

  return (
    <section className={CARD}>
      <CardHeader
        icon={<SearchIcon className="h-3.5 w-3.5" />}
        title="Tracking parameters"
        description={
          <>
            {parameters.length} found in the observed URLs. These travel inside the address itself, so
            they persist when a link is copied, shared or bookmarked.
          </>
        }
      />

      <ul className="mt-4 grid grid-cols-1 gap-1.5">
        {parameters.map((parameter, index) => {
          const isClickId = parameter.category === 'click-id';
          return (
            <motion.li
              key={parameter.key}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.04, ease: EASE_OUT }}
              className="surface-inset px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code
                  className={`technical rounded-sm px-1.5 py-0.5 text-xs ${
                    isClickId ? 'bg-amber/10 text-amber-glow' : 'bg-white/[0.05] text-parchment'
                  }`}
                >
                  {parameter.key}
                </code>
                <span
                  className={`chip ${
                    isClickId
                      ? 'border-amber/30 bg-amber/10 text-amber'
                      : 'border-white/[0.08] bg-white/[0.03] text-ash-light'
                  }`}
                >
                  {PARAMETER_CATEGORY_LABEL[parameter.category]}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-ash-dim">
                {parameter.operator} · seen in {parameter.occurrences}{' '}
                {parameter.occurrences === 1 ? 'URL' : 'URLs'}
              </p>
            </motion.li>
          );
        })}
      </ul>

      {clickIds.length > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/[0.06] px-3 py-2 text-xs leading-relaxed text-amber">
          <WarnIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {clickIds.length === 1
            ? 'One click identifier can tie this visit to a specific ad click.'
            : `${clickIds.length} click identifiers can tie this visit to specific ad clicks.`}
        </p>
      ) : null}

      {sampleUrl ? (
        <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
          <div>
            <p className="eyebrow">Observed URL</p>
            <p className="technical mt-1.5 break-all rounded-lg bg-black/25 px-3 py-2 text-xs leading-relaxed text-ash-light">
              <HighlightedUrl url={sampleUrl} keys={keys} />
            </p>
          </div>
          <div>
            <p className="eyebrow text-verdigris-bright">Without tracking parameters</p>
            <p className="technical mt-1.5 break-all rounded-lg border border-verdigris-bright/15 bg-verdigris-bright/[0.05] px-3 py-2 text-xs leading-relaxed text-verdigris-glow">
              {stripTrackingParameters(sampleUrl)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The URL with each matched `key=value` pair marked, so the before/after pair
 * shows exactly what stripping removes. Display only: the stripped form below
 * comes from `stripTrackingParameters`, not from this split.
 */
function HighlightedUrl({ url, keys }: { readonly url: string; readonly keys: ReadonlySet<string> }) {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return <>{url}</>;
  const base = url.slice(0, queryStart);
  const pairs = url.slice(queryStart + 1).split('&');
  return (
    <>
      {base}?
      {pairs.map((pair, index) => {
        const key = pair.split('=')[0] ?? '';
        const isTracking = keys.has(key.toLowerCase()) || keys.has(key);
        return (
          <span key={`${pair}-${index}`}>
            {index > 0 ? '&' : ''}
            {isTracking ? (
              <mark className="rounded-sm bg-amber/15 px-0.5 text-amber-glow line-through decoration-amber/60">
                {pair}
              </mark>
            ) : (
              pair
            )}
          </span>
        );
      })}
    </>
  );
}

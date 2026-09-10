'use client';

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
  if (parameters.length === 0) {
    return (
      <section className="rounded-lg border border-verdigris-dim bg-verdigris-dim/10 p-4">
        <h3 className="font-body text-sm font-medium text-verdigris">No tracking parameters</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ash-light">
          No known campaign or click-identifier parameters appeared in the URLs observed in this
          scan.
        </p>
      </section>
    );
  }

  const clickIds = parameters.filter((parameter) => parameter.category === 'click-id');

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Tracking parameters</h3>
      <p className="mt-1 text-xs leading-relaxed text-ash">
        {parameters.length} found in the observed URLs. These travel inside the address itself, so
        they persist when a link is copied, shared or bookmarked.
      </p>

      <ul className="mt-3 space-y-1">
        {parameters.map((parameter) => (
          <li
            key={parameter.key}
            className="rounded-md border border-ink-edge bg-ink px-3 py-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="technical text-xs text-parchment">{parameter.key}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs ${
                  parameter.category === 'click-id'
                    ? 'border-amber-dim text-amber'
                    : 'border-ink-edge text-ash-light'
                }`}
              >
                {PARAMETER_CATEGORY_LABEL[parameter.category]}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-ash-dim">
              {parameter.operator} · seen in {parameter.occurrences}{' '}
              {parameter.occurrences === 1 ? 'URL' : 'URLs'}
            </p>
          </li>
        ))}
      </ul>

      {clickIds.length > 0 ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-amber">
          <span aria-hidden="true">⚠</span>
          {clickIds.length === 1
            ? 'One click identifier can tie this visit to a specific ad click.'
            : `${clickIds.length} click identifiers can tie this visit to specific ad clicks.`}
        </p>
      ) : null}

      {sampleUrl ? (
        <div className="mt-3 border-t border-ink-edge pt-3">
          <p className="text-xs text-ash-dim">Without tracking parameters</p>
          <p className="technical mt-1 break-all text-xs text-verdigris">
            {stripTrackingParameters(sampleUrl)}
          </p>
        </div>
      ) : null}
    </section>
  );
}

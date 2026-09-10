'use client';

/**
 * Per-site privacy controls (spec §11).
 *
 * The override is client-side and session-scoped by design: it changes what the
 * report shows would happen, and is deliberately not persisted, so a temporary
 * allowance cannot silently outlive the session it was granted in.
 */
export function SiteControls({
  domain,
  blockedCount,
  isOverridden,
  blockThirdPartyTrackers,
  onAllowTemporarily,
  onReset,
  onToggleThirdPartyBlocking,
}: {
  readonly domain: string;
  readonly blockedCount: number;
  readonly isOverridden: boolean;
  /** Strict mode: block every third-party tracker, overriding an allowance. */
  readonly blockThirdPartyTrackers: boolean;
  readonly onAllowTemporarily: () => void;
  readonly onReset: () => void;
  readonly onToggleThirdPartyBlocking: (next: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Site controls</h3>
      <p className="technical mt-1 truncate text-xs text-ash">{domain}</p>

      <p className="mt-2 text-xs text-ash-light">
        {isOverridden
          ? 'Tracker rules are currently relaxed for this site in this session.'
          : `${blockedCount} ${blockedCount === 1 ? 'request' : 'requests'} would be blocked by your current rules.`}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onAllowTemporarily}
          disabled={isOverridden || blockedCount === 0}
          className="rounded-md border border-amber-dim bg-amber-dim/15 px-3 py-2 font-body text-xs text-amber transition-colors duration-150 hover:bg-amber-dim/25 disabled:cursor-not-allowed disabled:border-ink-edge disabled:bg-transparent disabled:text-ash-dim"
        >
          Allow trackers on this site temporarily
        </button>

        <button
          type="button"
          onClick={() => onToggleThirdPartyBlocking(!blockThirdPartyTrackers)}
          aria-pressed={blockThirdPartyTrackers}
          className={`rounded-md border px-3 py-2 font-body text-xs transition-colors duration-150 ${
            blockThirdPartyTrackers
              ? 'border-verdigris bg-verdigris-dim/20 text-verdigris hover:bg-verdigris-dim/30'
              : 'border-ink-edge text-ash-light hover:border-ash-dim hover:text-parchment'
          }`}
        >
          {blockThirdPartyTrackers
            ? 'Third-party trackers blocked'
            : 'Block third-party trackers'}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={!isOverridden && !blockThirdPartyTrackers}
          className="rounded-md border border-ink-edge px-3 py-2 font-body text-xs text-ash-light transition-colors duration-150 hover:border-ash-dim hover:text-parchment disabled:cursor-not-allowed disabled:text-ash-dim"
        >
          Reset site settings
        </button>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-ash-dim">
        {blockThirdPartyTrackers
          ? 'Strict blocking takes precedence over a temporary allowance. Both apply to this session only and are not saved.'
          : 'A temporary allowance applies to this session only and is not saved.'}
      </p>
    </section>
  );
}

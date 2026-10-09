'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { CARD, CardHeader, EASE_UI, SPRING } from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { ReloadIcon, ShieldIcon, UnlockIcon } from '@/components/ui/icons';

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
  // Which rule set the report currently reflects. Strict wins, matching the
  // precedence the report applies.
  const mode = blockThirdPartyTrackers ? 'strict' : isOverridden ? 'relaxed' : 'default';

  return (
    <section className={CARD}>
      <CardHeader
        icon={<ShieldIcon className="h-3.5 w-3.5" />}
        title="Site controls"
        description={<span className="technical block truncate">{domain}</span>}
        aside={
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_UI }}
              className={`chip ${
                mode === 'relaxed'
                  ? 'border-amber/30 bg-amber/10 text-amber'
                  : mode === 'strict'
                    ? 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright'
                    : 'border-white/[0.08] bg-white/[0.03] text-ash-light'
              }`}
            >
              {mode === 'relaxed' ? 'Relaxed' : mode === 'strict' ? 'Strict' : 'Default rules'}
            </motion.span>
          </AnimatePresence>
        }
      />

      <div className="mt-4 flex items-end gap-3">
        <span
          aria-hidden="true"
          className={`font-display text-5xl leading-none transition-colors duration-300 ${
            isOverridden && !blockThirdPartyTrackers
              ? 'text-ash-dim line-through decoration-1'
              : blockedCount === 0
                ? 'text-ash-light'
                : 'text-amber-glow'
          }`}
        >
          <AnimatedNumber value={blockedCount} />
        </span>
        <p className="pb-1 text-xs leading-relaxed text-ash-light">
          {isOverridden
            ? 'Tracker rules are currently relaxed for this site in this session.'
            : `${blockedCount} ${blockedCount === 1 ? 'request' : 'requests'} would be blocked by your current rules.`}
        </p>
      </div>

      {/* Strict blocking as a switch: the state is the point, so it is shown, not described. */}
      <button
        type="button"
        onClick={() => onToggleThirdPartyBlocking(!blockThirdPartyTrackers)}
        aria-pressed={blockThirdPartyTrackers}
        className={`mt-4 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors duration-200 ${
          blockThirdPartyTrackers
            ? 'border-verdigris-bright/25 bg-verdigris-bright/[0.06]'
            : 'border-white/[0.07] bg-black/20 hover:border-white/[0.12] hover:bg-white/[0.03]'
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block font-body text-xs font-medium ${
              blockThirdPartyTrackers ? 'text-verdigris-bright' : 'text-parchment'
            }`}
          >
            {blockThirdPartyTrackers ? 'Third-party trackers blocked' : 'Block third-party trackers'}
          </span>
          <span aria-hidden="true" className="mt-0.5 block text-xs text-ash">
            Every third-party tracking request, this session
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ${
            blockThirdPartyTrackers
              ? 'justify-end border-verdigris-bright/50 bg-verdigris-bright/30'
              : 'justify-start border-white/[0.1] bg-white/[0.06]'
          }`}
          style={blockThirdPartyTrackers ? { boxShadow: '0 0 16px -4px rgba(91,194,170,0.7)' } : undefined}
        >
          <motion.span
            layout
            transition={SPRING}
            className={`h-3.5 w-3.5 rounded-full ${blockThirdPartyTrackers ? 'bg-verdigris-glow' : 'bg-ash-light'}`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
          />
        </span>
      </button>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={onAllowTemporarily}
          disabled={isOverridden || blockedCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-amber/30 bg-amber/[0.08] px-4 py-2 font-body text-xs font-medium text-amber transition-all duration-200 hover:border-amber/50 hover:bg-amber/[0.14] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-transparent disabled:text-ash-dim disabled:active:scale-100"
        >
          <UnlockIcon className="h-3.5 w-3.5" />
          Allow trackers on this site temporarily
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={!isOverridden && !blockThirdPartyTrackers}
          className="btn-ghost justify-center border border-white/[0.06] px-4 py-2 text-xs disabled:cursor-not-allowed disabled:text-ash-dim disabled:hover:bg-transparent"
        >
          <ReloadIcon className="h-3.5 w-3.5" />
          Reset site settings
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ash-dim">
        {blockThirdPartyTrackers
          ? 'Strict blocking takes precedence over a temporary allowance. Both apply to this session only and are not saved.'
          : 'A temporary allowance applies to this session only and is not saved.'}
      </p>
    </section>
  );
}

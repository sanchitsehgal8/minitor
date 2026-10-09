'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { CheckIcon, ShieldIcon, WarnIcon } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/panel-states';
import {
  ENFORCED_DISCLOSURE,
  ENFORCEMENT_COPY,
  SIMULATION_DISCLOSURE,
  formatEventTime,
  type PrivacyEvent,
} from '@/lib/privacy/privacy-console';
import { blocklistSize } from '@/lib/privacy/tracker-blocklist';

/**
 * The live block log. The disclosure sits in the header, in body copy, where it
 * cannot be missed (spec §6) — not in a tooltip and not on a docs page.
 */
export function PrivacyConsole({
  events,
  isEnforcedPage,
  onClear,
}: {
  readonly events: readonly PrivacyEvent[];
  /** True when the loaded page is first-party and blocking is genuinely real. */
  readonly isEnforcedPage: boolean;
  readonly onClear: () => void;
}) {
  return (
    <section aria-label="Privacy console" className="flex h-full flex-col">
      <header className="border-b border-white/[0.06] px-4 pb-4 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2.5 font-body text-sm font-medium text-parchment">
            {/* Live indicator, coloured by what the log can honestly claim. */}
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span
                className={`absolute inset-0 animate-ping rounded-full ${
                  isEnforcedPage ? 'bg-verdigris-bright' : 'bg-amber'
                }`}
              />
              <span
                className={`relative h-2 w-2 rounded-full ${
                  isEnforcedPage ? 'bg-verdigris-bright' : 'bg-amber'
                }`}
              />
            </span>
            Privacy console
          </h2>
          <button type="button" onClick={onClear} className="btn-ghost px-2.5 py-1 font-mono text-xs">
            Clear log
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isEnforcedPage ? 'enforced' : 'simulated'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`relative mt-3 flex items-start gap-2.5 overflow-hidden rounded-lg border px-3 py-2.5 ${
              isEnforcedPage
                ? 'border-verdigris-bright/25 bg-verdigris/[0.08]'
                : 'border-amber/25 bg-amber/[0.07]'
            }`}
          >
            <span
              className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isEnforcedPage ? 'bg-verdigris/20 text-verdigris-glow' : 'bg-amber/15 text-amber'
              }`}
            >
              {isEnforcedPage ? <CheckIcon className="h-3 w-3" /> : <WarnIcon className="h-3 w-3" />}
            </span>
            <p
              className={`text-xs leading-relaxed ${
                isEnforcedPage ? 'text-verdigris-glow' : 'text-amber-glow'
              }`}
            >
              {isEnforcedPage ? ENFORCED_DISCLOSURE : SIMULATION_DISCLOSURE}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* dt precedes dd in the markup, as a <dl> requires; the number is moved first visually. */}
        <dl className="mt-3 flex items-baseline gap-4 px-0.5">
          <div className="flex items-baseline gap-1.5">
            <dt className="technical text-xs text-ash">logged</dt>
            <dd className="order-first font-display text-2xl leading-none text-parchment">
              <LiveCount value={events.length} />
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5 border-l border-white/10 pl-4">
            <dt className="technical text-xs text-ash">domains on blocklist</dt>
            <dd className="order-first font-display text-2xl leading-none text-parchment">
              <AnimatedNumber value={blocklistSize()} duration={0.9} />
            </dd>
          </div>
        </dl>
      </header>

      <div className="log-scroll flex-1 overflow-y-auto px-2.5 py-2.5">
        {events.length === 0 ? (
          <EmptyState icon={<ShieldIcon className="h-5 w-5" />}>
            Nothing logged yet. Load a page to see requests matched against the blocklist.
          </EmptyState>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {events.map((event) => {
                const isBlocked = event.enforcement === 'blocked';
                return (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, x: -14, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02] py-2 pl-4 pr-3 transition-colors duration-200 hover:border-white/[0.09] hover:bg-white/[0.04]"
                  >
                    {/* Accent bar: verdigris when the request was really stopped. */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-2 left-1.5 w-0.5 rounded-full ${
                        isBlocked
                          ? 'bg-verdigris-bright shadow-[0_0_8px_rgba(91,194,170,0.7)]'
                          : 'bg-amber shadow-[0_0_8px_rgba(216,162,74,0.6)]'
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="technical truncate text-sm text-parchment">{event.domain}</span>
                      <span className="technical tabular shrink-0 text-xs text-ash">
                        {formatEventTime(event.at)}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      <span
                        className={`chip uppercase tracking-wider ${
                          isBlocked
                            ? 'border-verdigris-bright/30 bg-verdigris/15 text-verdigris-glow'
                            : 'border-amber/30 bg-amber/10 text-amber'
                        }`}
                      >
                        {ENFORCEMENT_COPY[event.enforcement]}
                      </span>
                      <span className="truncate text-xs text-ash">
                        {event.category} · {event.operator}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * The log size ticks over rather than counting up: it changes in bursts while
 * the user watches, and a rolling digit reads as "new arrivals" where a
 * count-up from zero would replay history.
 */
function LiveCount({ value }: { readonly value: number }) {
  return (
    <span className="tabular relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-70%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '70%', opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

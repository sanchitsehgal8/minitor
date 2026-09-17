'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { ShieldIcon } from '@/components/ui/icons';
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
    <section aria-label="Privacy console" className="flex h-full flex-col bg-ink-sunken">
      <header className="border-b border-ink-edge px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-body text-sm font-medium text-parchment">
            <ShieldIcon className="h-4 w-4 text-verdigris" />
            Privacy console
          </h2>
          <button
            type="button"
            onClick={onClear}
            className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-ash transition-colors duration-150 hover:text-parchment"
          >
            Clear log
          </button>
        </div>

        <p
          className={`mt-2.5 rounded-md border px-2.5 py-2 text-xs leading-relaxed ${
            isEnforcedPage
              ? 'border-verdigris-dim bg-verdigris-dim/15 text-verdigris'
              : 'border-amber-dim bg-amber-dim/15 text-amber'
          }`}
        >
          {isEnforcedPage ? ENFORCED_DISCLOSURE : SIMULATION_DISCLOSURE}
        </p>

        <p className="technical mt-2 text-xs text-ash-dim">
          {events.length} logged · {blocklistSize()} domains on blocklist
        </p>
      </header>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {events.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ash-dim">
            Nothing logged yet. Load a page to see requests matched against the blocklist.
          </p>
        ) : (
          <ul className="space-y-0.5">
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <motion.li
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="rounded-md px-2 py-1.5 hover:bg-ink-raised"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="technical truncate text-xs text-parchment">{event.domain}</span>
                    <span className="technical shrink-0 text-xs text-ash-dim">
                      {formatEventTime(event.at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`technical rounded-sm px-1 py-px text-xs ${
                        event.enforcement === 'blocked'
                          ? 'bg-verdigris-dim/25 text-verdigris'
                          : 'bg-amber-dim/20 text-amber'
                      }`}
                    >
                      {ENFORCEMENT_COPY[event.enforcement]}
                    </span>
                    <span className="text-xs text-ash-dim">
                      {event.category} · {event.operator}
                    </span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

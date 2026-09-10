'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { LockIcon, ShieldIcon, UnlockIcon } from '@/components/ui/icons';

/**
 * The hero (spec §4): a live replica of the MiniTor chrome, not a screenshot.
 *
 * One orchestrated sequence, played once on mount:
 *   type the URL → tracker toast slides out of the padlock → padlock locks.
 *
 * Under prefers-reduced-motion the sequence is skipped entirely and the final
 * state renders immediately — a static fallback, not a missing one.
 */

const TYPED_URL = 'en.wikipedia.org/wiki/Onion_routing';
const BLOCKED_DOMAINS = ['google-analytics.com', 'doubleclick.net', 'scorecardresearch.com'];

type Phase = 'typing' | 'toast' | 'locked';

export function ChromeReplica() {
  const prefersReducedMotion = useReducedMotion();
  const [typedLength, setTypedLength] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');

  const skipAnimation = prefersReducedMotion === true;

  useEffect(() => {
    if (skipAnimation) {
      setTypedLength(TYPED_URL.length);
      setPhase('locked');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let index = 0;

    // 34ms/char reads as deliberate typing without making the visitor wait.
    const typing = setInterval(() => {
      index += 1;
      setTypedLength(index);
      if (index >= TYPED_URL.length) {
        clearInterval(typing);
        timers.push(setTimeout(() => setPhase('toast'), 260));
        timers.push(setTimeout(() => setPhase('locked'), 1_950));
      }
    }, 34);

    return () => {
      clearInterval(typing);
      timers.forEach(clearTimeout);
    };
  }, [skipAnimation]);

  const typed = useMemo(() => TYPED_URL.slice(0, typedLength), [typedLength]);
  const isLocked = phase === 'locked';
  const showToast = phase === 'toast';

  return (
    <div className="on-ink w-full overflow-hidden rounded-xl bg-ink shadow-chrome">
      <div className="flex items-end gap-1 border-b border-ink-edge bg-ink-sunken px-3 pt-3">
        <ReplicaTab label="Onion routing" isActive />
        <ReplicaTab label="MDN — X-Frame-Options" isActive={false} />
      </div>

      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex gap-1 text-ash-dim" aria-hidden="true">
          <span className="flex h-7 w-7 items-center justify-center rounded-md">‹</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md">›</span>
        </div>

        <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-md border border-ink-edge bg-ink-raised px-3 py-2">
          <motion.span
            aria-hidden="true"
            animate={{ color: isLocked ? '#3E8E7E' : '#8A8F98' }}
            transition={{ duration: 0.28 }}
            className="shrink-0"
          >
            {isLocked ? <LockIcon className="h-4 w-4" /> : <UnlockIcon className="h-4 w-4" />}
          </motion.span>

          <span className="technical truncate text-sm text-parchment">
            {typed}
            {typedLength < TYPED_URL.length && !skipAnimation ? (
              <span className="ml-px inline-block h-4 w-px animate-pulse bg-verdigris align-middle" />
            ) : null}
          </span>

          <AnimatePresence>
            {showToast ? (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                className="absolute left-2 top-full z-10 mt-2 w-56 rounded-lg border border-amber-dim bg-ink-raised p-3 shadow-chrome"
                role="status"
              >
                <p className="flex items-center gap-1.5 font-body text-sm font-medium text-amber">
                  <ShieldIcon className="h-4 w-4" />
                  3 trackers blocked
                </p>
                <ul className="mt-2 space-y-0.5">
                  {BLOCKED_DOMAINS.map((domain) => (
                    <li key={domain} className="technical text-xs text-ash">
                      {domain}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <span className="technical shrink-0 rounded-md bg-ink-raised px-2 py-1 text-xs text-ash">
          {isLocked ? 'HTTPS' : '···'}
        </span>
      </div>

      {/* A page area, so the replica reads as a browser window and not a toolbar. */}
      <div className="border-t border-ink-edge bg-paper px-5 py-5">
        <p className="font-display text-lg text-ink">Onion routing</p>
        <p className="mt-1 font-mono text-xs text-ash">From Wikipedia, the free encyclopedia</p>
        <div className="mt-3 space-y-1.5" aria-hidden="true">
          <span className="block h-1.5 w-full rounded-full bg-ash-light" />
          <span className="block h-1.5 w-11/12 rounded-full bg-ash-light" />
          <span className="block h-1.5 w-4/5 rounded-full bg-ash-light" />
          <span className="block h-1.5 w-1/2 rounded-full bg-ash-light" />
        </div>
      </div>

      <div className="border-t border-ink-edge bg-ink-sunken px-4 py-4">
        <p className="technical text-xs text-ash-dim">privacy console</p>
        <ul className="mt-2 space-y-1">
          {BLOCKED_DOMAINS.map((domain, index) => (
            <motion.li
              key={domain}
              initial={skipAnimation ? false : { opacity: 0 }}
              animate={{ opacity: isLocked || showToast ? 1 : 0.25 }}
              transition={{ duration: 0.2, delay: skipAnimation ? 0 : index * 0.08 }}
              className="technical flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate text-ash-light">{domain}</span>
              <span className="shrink-0 rounded-sm bg-amber-dim/20 px-1.5 py-0.5 text-amber">
                simulated
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReplicaTab({ label, isActive }: { readonly label: string; readonly isActive: boolean }) {
  return (
    <div
      className={`min-w-0 max-w-[46%] truncate rounded-t-md px-3 py-2 font-mono text-xs ${
        isActive ? 'bg-ink text-parchment' : 'bg-transparent text-ash-dim'
      }`}
    >
      {label}
    </div>
  );
}

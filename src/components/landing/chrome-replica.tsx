'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LockIcon,
  PlusIcon,
  ReloadIcon,
  ShieldIcon,
  StarIcon,
  UnlockIcon,
  WarnIcon,
} from '@/components/ui/icons';
import { TRACKER_BLOCKLIST } from '@/lib/privacy/tracker-blocklist';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/**
 * The showcase (spec §4): a live replica of the MiniTor chrome, not a
 * screenshot. It cycles through three scenes that are each true to how the app
 * behaves, so the demo makes the same distinction the product does:
 *
 *   simulated — a third-party page, where the console can only model blocking;
 *   enforced  — MiniTor's own demo page, where a CSP genuinely blocks trackers;
 *   https     — a plain-http address, which stops at a warning instead of loading.
 *
 * Each scene types its URL, loads, then streams console events. Autoplay runs
 * only while the replica is on screen. Under prefers-reduced-motion nothing
 * plays: each scene renders in its final state and the visitor steps through
 * them with the scene buttons.
 */

type SceneId = 'simulated' | 'enforced' | 'https';
type Enforcement = 'simulated' | 'blocked';

type ConsoleEvent = { readonly domain: string; readonly detail: string };

type Scene = {
  readonly id: SceneId;
  readonly pill: string;
  readonly caption: string;
  readonly tabTitle: string;
  readonly url: string;
  readonly secure: boolean;
  readonly enforcement: Enforcement | null;
  readonly events: readonly ConsoleEvent[];
};

const describe = (domain: string): ConsoleEvent => {
  const rule = TRACKER_BLOCKLIST.find((entry) => entry.domain === domain);
  return { domain, detail: rule ? `${rule.category} · ${rule.operator}` : 'tracker' };
};

const SCENES: readonly Scene[] = [
  {
    id: 'simulated',
    pill: 'Third-party page',
    caption:
      'A cross-origin page hides its network traffic from the page embedding it, so the console models what MiniTor’s rules would block — and labels every entry simulated.',
    tabTitle: 'Onion routing',
    url: 'en.wikipedia.org/wiki/Onion_routing',
    secure: true,
    enforcement: 'simulated',
    events: ['google-analytics.com', 'doubleclick.net', 'scorecardresearch.com'].map(describe),
  },
  {
    id: 'enforced',
    pill: 'MiniTor’s demo page',
    caption:
      'MiniTor serves this page itself, so a Content-Security-Policy refuses every blocklisted origin before a connection opens. These blocks are real.',
    tabTitle: 'Tracker-heavy demo',
    url: 'minitor.local/demo/tracker-heavy',
    secure: true,
    enforcement: 'blocked',
    // The same six the real demo page requests.
    events: TRACKER_BLOCKLIST.slice(0, 6).map((rule) => describe(rule.domain)),
  },
  {
    id: 'https',
    pill: 'HTTPS-only',
    caption:
      'Type a plain http address and MiniTor stops at a warning instead of loading the page unencrypted. Nothing is requested until you choose.',
    tabTitle: 'neverssl.com',
    url: 'http://neverssl.com',
    secure: false,
    enforcement: null,
    events: [],
  },
];

const TYPE_MS = 32;
const LOAD_MS = 560;
const EVENT_GAP_MS = 280;
const HOLD_MS = 3400;
const EASE = [0.16, 1, 0.3, 1] as const;

type Phase = 'typing' | 'loading' | 'loaded';

function sceneDuration(scene: Scene): number {
  return scene.url.length * TYPE_MS + LOAD_MS + 300 + scene.events.length * EVENT_GAP_MS + HOLD_MS;
}

export function ChromeReplica() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.35 });
  const prefersReducedMotion = usePrefersReducedMotion();

  const [sceneIndex, setSceneIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [eventCount, setEventCount] = useState(0);

  const scene = SCENES[sceneIndex]!;

  useEffect(() => {
    const current = SCENES[sceneIndex]!;
    if (prefersReducedMotion) {
      setTypedLength(current.url.length);
      setPhase('loaded');
      setEventCount(current.events.length);
      return;
    }
    if (!isInView) return;

    setTypedLength(0);
    setPhase('typing');
    setEventCount(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let index = 0;
    const typing = setInterval(() => {
      index += 1;
      setTypedLength(index);
      if (index < current.url.length) return;
      clearInterval(typing);
      setPhase('loading');
      timers.push(
        setTimeout(() => {
          setPhase('loaded');
          current.events.forEach((_, eventIndex) => {
            timers.push(setTimeout(() => setEventCount(eventIndex + 1), 300 + eventIndex * EVENT_GAP_MS));
          });
          timers.push(
            setTimeout(
              () => setSceneIndex((value) => (value + 1) % SCENES.length),
              300 + current.events.length * EVENT_GAP_MS + HOLD_MS,
            ),
          );
        }, LOAD_MS),
      );
    }, TYPE_MS);

    return () => {
      clearInterval(typing);
      timers.forEach(clearTimeout);
    };
  }, [sceneIndex, isInView, prefersReducedMotion, run]);

  const typed = scene.url.slice(0, typedLength);
  const isTyping = phase === 'typing' && !prefersReducedMotion;
  const isLoaded = phase === 'loaded';
  const showSecurity = typedLength >= scene.url.length;

  return (
    <div ref={ref}>
      <div
        aria-hidden="true"
        className="on-ink relative w-full overflow-hidden rounded-2xl border border-white/10 bg-ink shadow-window"
      >
        {/* Title bar and tabs */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-ink-sunken px-4 pt-2.5">
          <div className="hidden shrink-0 gap-1.5 pb-2.5 sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <div className="flex min-w-0 flex-1 items-end gap-1">
            {SCENES.map((entry, index) => {
              const isActive = index === sceneIndex;
              return (
                <div
                  key={entry.id}
                  className={`relative flex min-w-0 max-w-[12rem] flex-1 items-center gap-2 rounded-t-lg px-3 py-2 font-mono text-xs transition-colors duration-300 ${
                    isActive ? 'text-parchment' : 'text-ash-dim'
                  } ${index === 2 ? 'hidden sm:flex' : ''}`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="replica-active-tab"
                      className="absolute inset-0 rounded-t-lg bg-ink"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <span
                    className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-medium ${
                      entry.secure ? 'bg-verdigris/20 text-verdigris-glow' : 'bg-amber/20 text-amber-glow'
                    }`}
                  >
                    {entry.tabTitle.charAt(0).toUpperCase()}
                  </span>
                  <span className="relative truncate">{entry.tabTitle}</span>
                </div>
              );
            })}
          </div>
          <PlusIcon className="mb-2.5 h-3.5 w-3.5 shrink-0 text-ash-dim" />
        </div>

        {/* Toolbar */}
        <div className="relative flex items-center gap-2 bg-ink px-3 py-2.5">
          <div className="flex shrink-0 gap-0.5 text-ash-dim">
            <span className="flex h-7 w-7 items-center justify-center rounded-full">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
            </span>
            <span className="hidden h-7 w-7 items-center justify-center rounded-full sm:flex">
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </span>
            <span className="hidden h-7 w-7 items-center justify-center rounded-full sm:flex">
              <ReloadIcon className="h-3.5 w-3.5" />
            </span>
          </div>

          <div
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors duration-300 ${
              isTyping ? 'border-verdigris-bright/50 bg-white/[0.05]' : 'border-white/[0.07] bg-white/[0.03]'
            }`}
          >
            <motion.span
              key={`${scene.id}-${showSecurity}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`shrink-0 ${
                !showSecurity ? 'text-ash-dim' : scene.secure ? 'text-verdigris-bright' : 'text-amber-glow'
              }`}
            >
              {showSecurity && !scene.secure ? <UnlockIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
            </motion.span>
            <span className="technical min-w-0 flex-1 truncate text-xs text-parchment sm:text-sm">
              {typed}
              {isTyping ? (
                <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-verdigris-glow align-middle" />
              ) : null}
            </span>
            <AnimatePresence>
              {showSecurity ? (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`chip hidden sm:inline-flex ${
                    scene.secure
                      ? 'border-verdigris-bright/30 text-verdigris-glow'
                      : 'border-amber/40 text-amber-glow'
                  }`}
                >
                  {scene.secure ? 'Secure' : 'Not secure'}
                </motion.span>
              ) : null}
            </AnimatePresence>
            <StarIcon className="hidden h-3.5 w-3.5 shrink-0 text-ash-dim sm:block" />
          </div>

          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] text-verdigris-bright">
            <ShieldIcon className="h-3.5 w-3.5" />
            <AnimatePresence>
              {eventCount > 0 ? (
                <motion.span
                  key={eventCount}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                  className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] text-void ${
                    scene.enforcement === 'blocked' ? 'bg-verdigris-bright' : 'bg-amber'
                  }`}
                >
                  {eventCount}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </span>

          {/* Loading sweep */}
          <AnimatePresence>
            {phase === 'loading' && !prefersReducedMotion ? (
              <motion.span
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-verdigris via-verdigris-glow to-transparent"
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: LOAD_MS / 1000, ease: EASE }}
              />
            ) : null}
          </AnimatePresence>
        </div>

        {/* Body: page + privacy console */}
        <div className="grid border-t border-white/[0.06] md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="relative h-64 overflow-hidden sm:h-80">
            <AnimatePresence mode="wait">
              {isLoaded ? (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="absolute inset-0"
                >
                  <ScenePage scene={scene} eventCount={eventCount} />
                </motion.div>
              ) : (
                <motion.div
                  key="blank"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-ink-raised p-6"
                >
                  <div className="space-y-3">
                    {[64, 92, 80, 40].map((width, index) => (
                      <span
                        key={index}
                        className="relative block h-2.5 overflow-hidden rounded-full bg-white/[0.05]"
                        style={{ width: `${width}%` }}
                      >
                        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ConsolePanel scene={scene} eventCount={eventCount} isLoaded={isLoaded} />
        </div>
      </div>

      {/* Scene controls: real buttons, outside the decorative replica. */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3" role="group" aria-label="Replica scenes">
        {SCENES.map((entry, index) => {
          const isActive = index === sceneIndex;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setSceneIndex(index);
                setRun((value) => value + 1);
              }}
              className={`group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                isActive
                  ? 'border-white/15 bg-white/[0.06]'
                  : 'border-white/[0.06] bg-transparent hover:border-white/10 hover:bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-parchment">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    entry.enforcement === 'blocked'
                      ? 'bg-verdigris-bright'
                      : entry.enforcement === 'simulated'
                        ? 'bg-amber'
                        : 'bg-amber-glow'
                  }`}
                />
                {entry.pill}
              </span>
              <span className="mt-1 block font-mono text-xs text-ash">
                {entry.enforcement === 'blocked'
                  ? 'Blocking enforced'
                  : entry.enforcement === 'simulated'
                    ? 'Blocking simulated'
                    : 'Stops before loading'}
              </span>
              {isActive && isInView && !prefersReducedMotion ? (
                <motion.span
                  key={`${sceneIndex}-${run}`}
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-verdigris-bright"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: sceneDuration(entry) / 1000, ease: 'linear' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={scene.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mx-auto mt-5 max-w-2xl text-center text-sm text-ash-light"
          aria-live="polite"
        >
          {scene.caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function ScenePage({ scene, eventCount }: { readonly scene: Scene; readonly eventCount: number }) {
  if (scene.id === 'https') {
    return (
      <div className="flex h-full items-center justify-center bg-ink-raised p-5">
        <div className="w-full max-w-sm rounded-xl border border-amber/30 bg-amber/[0.06] p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-glow">
            <WarnIcon className="h-3.5 w-3.5" />
            Connection is not encrypted
          </p>
          <p className="mt-2 font-display text-2xl leading-tight text-parchment">
            neverssl.com was requested over http
          </p>
          <p className="mt-2 text-xs text-ash-light">MiniTor did not load this page.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-verdigris-bright px-3 py-1 text-xs font-medium text-void">
              Try https instead
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-ash-light">
              Load it anyway
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (scene.id === 'enforced') {
    return (
      <div className="h-full overflow-hidden bg-paper px-6 py-5 text-void">
        <span className="inline-flex items-center rounded-full border border-verdigris bg-verdigris-wash px-2 py-0.5 font-mono text-[10px] text-verdigris-dim">
          Blocking is real on this page
        </span>
        <p className="mt-2 font-display text-2xl leading-tight">A page that tries to track you</p>
        <ul className="mt-3 space-y-1">
          {scene.events.map((event, index) => (
            <li
              key={event.domain}
              className="flex items-center justify-between gap-2 rounded-md border border-ash-light/70 bg-white px-2.5 py-1"
            >
              <span className="technical truncate text-[11px] text-void">{event.domain}</span>
              <span
                className={`shrink-0 font-mono text-[10px] transition-colors duration-300 ${
                  index < eventCount ? 'text-verdigris-dim' : 'text-ash'
                }`}
              >
                {index < eventCount ? 'refused · csp' : 'requesting…'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-paper px-6 py-5 text-void">
      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl leading-tight">Onion routing</p>
          <p className="mt-0.5 font-mono text-[10px] text-ash">From Wikipedia, the free encyclopedia</p>
          <div className="mt-4 h-px w-full bg-ash-light" />
          <div className="mt-4 space-y-2">
            {[100, 94, 97, 72, 0, 100, 88, 60].map((width, index) =>
              width === 0 ? (
                <span key={index} className="block h-2" />
              ) : (
                <span key={index} className="block h-1.5 rounded-full bg-ash-light/70" style={{ width: `${width}%` }} />
              ),
            )}
          </div>
        </div>
        <div className="hidden w-28 shrink-0 rounded-md border border-ash-light bg-white p-2 sm:block">
          <svg viewBox="0 0 80 80" className="h-auto w-full" fill="none">
            <circle cx="40" cy="40" r="34" stroke="#C4C7CC" strokeWidth="1.5" />
            <circle cx="40" cy="44" r="23" stroke="#8A8F98" strokeWidth="1.5" />
            <circle cx="40" cy="48" r="12" fill="#3E8E7E" />
          </svg>
          <span className="mt-2 block h-1 w-full rounded-full bg-ash-light/70" />
          <span className="mt-1 block h-1 w-2/3 rounded-full bg-ash-light/70" />
        </div>
      </div>
    </div>
  );
}

function ConsolePanel({
  scene,
  eventCount,
  isLoaded,
}: {
  readonly scene: Scene;
  readonly eventCount: number;
  readonly isLoaded: boolean;
}) {
  const visible = scene.events.slice(0, eventCount);
  const isEnforced = scene.enforcement === 'blocked';

  return (
    <div className="flex h-56 flex-col border-t border-white/[0.06] bg-ink-sunken sm:h-64 md:h-80 md:border-l md:border-t-0">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="flex items-center gap-2 text-xs font-medium text-parchment">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris-bright opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verdigris-bright" />
          </span>
          Privacy console
        </p>
        <span className="font-mono text-[10px] text-ash-dim">{eventCount} logged</span>
      </div>

      {scene.enforcement && isLoaded ? (
        <p
          className={`mx-3 rounded-lg border px-2.5 py-1.5 text-[10.5px] leading-snug ${
            isEnforced
              ? 'border-verdigris-bright/25 bg-verdigris/10 text-verdigris-glow'
              : 'border-amber/25 bg-amber/[0.07] text-amber-glow'
          }`}
        >
          {isEnforced ? 'Enforced for real on MiniTor-served pages.' : 'Simulated for this demo.'}
        </p>
      ) : null}

      <ul className="mask-fade-b mt-2 flex-1 space-y-1 overflow-hidden px-3 pb-3">
        <AnimatePresence initial={false}>
          {visible.map((event) => (
            <motion.li
              key={`${scene.id}-${event.domain}`}
              layout
              initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.025] py-1.5 pl-3 pr-2"
            >
              <span
                className={`absolute inset-y-0 left-0 w-0.5 ${isEnforced ? 'bg-verdigris-bright' : 'bg-amber'}`}
              />
              <span className="flex items-center justify-between gap-2">
                <span className="technical truncate text-[11px] text-parchment">{event.domain}</span>
                <span
                  className={`shrink-0 rounded-sm px-1.5 font-mono text-[10px] ${
                    isEnforced ? 'bg-verdigris/20 text-verdigris-glow' : 'bg-amber/15 text-amber-glow'
                  }`}
                >
                  {isEnforced ? 'Blocked' : 'Simulated'}
                </span>
              </span>
              <span className="block font-mono text-[10px] text-ash-dim">{event.detail}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {scene.id === 'https' && isLoaded ? (
          <li className="px-1 pt-2 text-[11px] leading-relaxed text-ash">
            Nothing logged. The page was never requested — MiniTor stopped at the warning.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { EASE_OUT, EASE_UI } from '@/components/privacy/privacy-primitives';
import { CheckIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { SCAN_STAGES } from '@/lib/scan/scan-stages';

/**
 * Blip positions on the radar, one per stage. Derived from the index with the
 * golden angle so they scatter evenly and land in the same place every scan.
 */
const BLIPS = SCAN_STAGES.map((stage, index) => {
  const angle = index * 2.39996 - Math.PI / 2;
  // Kept outside the centre read-out (radius ~0.43) so no blip lands behind it.
  const distance = 0.55 + ((index * 0.37) % 0.35);
  return {
    id: stage.id,
    x: 50 + Math.cos(angle) * distance * 44,
    y: 50 + Math.sin(angle) * distance * 44,
    // The tracker stage is where findings appear; its blip reads as caution.
    tone: stage.id === 'trackers' || stage.id === 'cookies' ? '#D8A24A' : '#5BC2AA',
  };
});

/**
 * Stage-by-stage scan progress (spec §2).
 *
 * Each row names a step the engine actually performs, so the sequence is a
 * report of work rather than decoration. The radar above it is decoration, and
 * is hidden from assistive technology accordingly: one blip lands per
 * completed stage, so it never shows more progress than the list does.
 */
export function ScanProgress({
  stageIndex,
  target,
}: {
  readonly stageIndex: number;
  readonly target: string;
}) {
  const progress = ((stageIndex + 1) / SCAN_STAGES.length) * 100;
  const prefersReducedMotion = usePrefersReducedMotion();

  const step = Math.min(stageIndex + 1, SCAN_STAGES.length);
  const currentLabel = SCAN_STAGES[stageIndex]?.label ?? '';

  return (
    // A scan takes ~3.4s. Without a live region a screen-reader user got no
    // indication it had started, progressed, or finished.
    <div className="log-scroll h-full overflow-y-auto px-5 py-6" role="status" aria-live="polite">
      {/* Below lg the panel is short, so the radar sits beside the heading
          rather than pushing the stage list out of view. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:block">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow flex items-center gap-2 text-verdigris-bright">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdigris-bright opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verdigris-bright" />
              </span>
              Scanning
            </p>
            <p className="technical tabular text-xs text-ash max-lg:hidden">
              Step {step} of {SCAN_STAGES.length}
            </p>
          </div>
          <p className="mt-3 font-display text-3xl leading-tight text-parchment">
            Analysing <span className="technical block truncate text-lg text-verdigris-glow">{target}</span>
          </p>
          <p className="technical tabular mt-1 text-xs text-ash lg:hidden" aria-hidden="true">
            Step {step} of {SCAN_STAGES.length}
          </p>
        </div>
        <span className="sr-only">
          {currentLabel}. Step {step} of {SCAN_STAGES.length}.
        </span>

        <Radar stageIndex={stageIndex} progress={progress} animate={!prefersReducedMotion} />
      </div>

      <div
        className="relative mt-6 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SCAN_STAGES.length}
        aria-valuenow={step}
        aria-valuetext={`${currentLabel}, step ${step} of ${SCAN_STAGES.length}`}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundImage: 'linear-gradient(90deg, #2F6D60, #5BC2AA 70%, #8AF0D6)',
            boxShadow: '0 0 12px rgba(138, 240, 214, 0.6)',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: EASE_UI }}
        />
      </div>

      <ol className="mt-5 space-y-0.5">
        {SCAN_STAGES.map((stage, index) => {
          const state = index < stageIndex ? 'done' : index === stageIndex ? 'active' : 'pending';
          return (
            <li
              key={stage.id}
              className={`relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5 transition-colors duration-300 ${
                state === 'active' ? 'bg-white/[0.04]' : ''
              }`}
            >
              {state === 'active' ? (
                // Shimmer across the live row. A CSS animation, so the global
                // reduced-motion rule already stops it.
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(138,240,214,0.08),transparent)]"
                />
              ) : null}
              <StageMark state={state} animate={!prefersReducedMotion} />
              <span
                className={`relative font-body text-xs transition-colors duration-300 ${
                  state === 'pending' ? 'text-ash-dim' : state === 'active' ? 'text-white' : 'text-ash-light'
                }`}
              >
                {stage.label}
              </span>
              {state === 'active' ? (
                // framer's reducedMotion="user" still runs opacity animations,
                // so the infinite pulse is gated explicitly rather than left to
                // the provider.
                <motion.span
                  key={prefersReducedMotion ? 'still' : 'pulse'}
                  aria-hidden="true"
                  className="relative ml-auto font-mono text-xs text-verdigris-bright"
                  animate={prefersReducedMotion ? undefined : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                >
                  running
                </motion.span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageMark({
  state,
  animate,
}: {
  readonly state: 'done' | 'active' | 'pending';
  readonly animate: boolean;
}) {
  return (
    <span aria-hidden="true" className="relative flex h-4 w-4 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        {state === 'done' ? (
          <motion.span
            key="done"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-verdigris-bright text-void"
            style={{ boxShadow: '0 0 12px -2px rgba(91, 194, 170, 0.8)' }}
          >
            <CheckIcon className="h-3 w-3" />
          </motion.span>
        ) : state === 'active' ? (
          <motion.span
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex h-4 w-4 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full border border-verdigris-bright/25" />
            <motion.span
              key={animate ? 'spin' : 'still'}
              className="absolute inset-0 rounded-full border border-transparent border-t-verdigris-glow"
              animate={animate ? { rotate: 360 } : undefined}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span className="h-1 w-1 rounded-full bg-verdigris-glow" />
          </motion.span>
        ) : (
          <motion.span key="pending" className="h-1.5 w-1.5 rounded-full bg-white/[0.14]" />
        )}
      </AnimatePresence>
    </span>
  );
}

/** Concentric rings, a rotating sweep, and one blip per completed stage. */
function Radar({
  stageIndex,
  progress,
  animate,
}: {
  readonly stageIndex: number;
  readonly progress: number;
  readonly animate: boolean;
}) {
  return (
    <div aria-hidden="true" className="relative aspect-square w-[120px] lg:mx-auto lg:mt-6 lg:w-full lg:max-w-[220px]">
      {/* Ambient glow and grid behind the scope. */}
      <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(62,142,126,0.22),transparent_62%)]" />

      <div className="absolute inset-0 overflow-hidden rounded-full border border-verdigris-bright/20 bg-[radial-gradient(circle,#0E1A19_0%,#08090D_72%)] shadow-[inset_0_0_40px_rgba(91,194,170,0.12)]">
        {/* Sweep: a conic wedge rotating once every 2.4s. */}
        <motion.div
          key={animate ? 'sweep' : 'still'}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(91,194,170,0.05) 300deg, rgba(138,240,214,0.38) 359deg, transparent 360deg)',
          }}
          animate={animate ? { rotate: 360 } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {[14, 26, 38, 48].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#5BC2AA" strokeOpacity={0.14} strokeWidth="0.35" />
          ))}
          <line x1="50" y1="2" x2="50" y2="98" stroke="#5BC2AA" strokeOpacity={0.1} strokeWidth="0.3" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#5BC2AA" strokeOpacity={0.1} strokeWidth="0.3" />
          {Array.from({ length: 36 }, (_, index) => {
            const angle = (index / 36) * Math.PI * 2;
            const inner = index % 3 === 0 ? 45 : 46.5;
            return (
              <line
                key={index}
                x1={50 + Math.cos(angle) * inner}
                y1={50 + Math.sin(angle) * inner}
                x2={50 + Math.cos(angle) * 48}
                y2={50 + Math.sin(angle) * 48}
                stroke="#8AF0D6"
                strokeOpacity={0.25}
                strokeWidth="0.35"
              />
            );
          })}

          {BLIPS.map((blip, index) =>
            index < stageIndex ? (
              <g key={blip.id}>
                <motion.circle
                  cx={blip.x}
                  cy={blip.y}
                  r="1.6"
                  fill={blip.tone}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  style={{ filter: `drop-shadow(0 0 2px ${blip.tone})` }}
                />
                <motion.circle
                  cx={blip.x}
                  cy={blip.y}
                  r="1.6"
                  fill="none"
                  stroke={blip.tone}
                  strokeWidth="0.4"
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 1.1, ease: EASE_OUT }}
                />
              </g>
            ) : null,
          )}
        </svg>
      </div>

      {/* Centre read-out. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-[38%] w-[38%] flex-col items-center justify-center rounded-full border border-white/[0.08] bg-void/80 shadow-[0_0_30px_rgba(91,194,170,0.25)] backdrop-blur-sm">
          {/* Rolls to each new value. Not a count-up: that waits to be
              scrolled into view, and would read 0% beside "Step 3 of 8". */}
          <span className="flex items-baseline font-display text-xl leading-none text-white lg:text-3xl">
            <span className="relative inline-flex overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={Math.round(progress)}
                  initial={{ y: '70%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  exit={{ y: '-70%', opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="tabular inline-block"
                >
                  {Math.round(progress)}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-sm text-ash lg:text-lg">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

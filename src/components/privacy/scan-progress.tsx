'use client';

import { motion } from 'framer-motion';

import { SCAN_STAGES } from '@/lib/scan/scan-stages';

/**
 * Stage-by-stage scan progress (spec §2).
 *
 * Each row names a step the engine actually performs, so the sequence is a
 * report of work rather than decoration.
 */
export function ScanProgress({
  stageIndex,
  target,
}: {
  readonly stageIndex: number;
  readonly target: string;
}) {
  const progress = ((stageIndex + 1) / SCAN_STAGES.length) * 100;

  return (
    <div className="px-4 py-5">
      <p className="font-body text-sm font-medium text-parchment">Analysing {target}</p>
      <p className="technical mt-1 text-xs text-ash-dim">
        Step {Math.min(stageIndex + 1, SCAN_STAGES.length)} of {SCAN_STAGES.length}
      </p>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-ink-edge">
        <motion.div
          className="h-full bg-verdigris"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>

      <ol className="mt-4 space-y-1.5">
        {SCAN_STAGES.map((stage, index) => {
          const state = index < stageIndex ? 'done' : index === stageIndex ? 'active' : 'pending';
          return (
            <li key={stage.id} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-xs ${
                  state === 'done'
                    ? 'border-verdigris bg-verdigris text-ink'
                    : state === 'active'
                      ? 'border-verdigris text-verdigris'
                      : 'border-ink-edge text-ash-dim'
                }`}
              >
                {state === 'done' ? '✓' : ''}
              </span>
              <span
                className={`font-body text-xs ${
                  state === 'pending' ? 'text-ash-dim' : 'text-parchment'
                }`}
              >
                {stage.label}
              </span>
              {state === 'active' ? (
                <motion.span
                  className="h-1 w-1 rounded-full bg-verdigris"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

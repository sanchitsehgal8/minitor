'use client';

import { motion } from 'framer-motion';

import { CARD, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { ScoreDial } from '@/components/privacy/score-dial';
import { CheckIcon, LockIcon, WarnIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  SECURITY_DISCLAIMER,
  SEVERITY_LABEL,
  countWarnings,
  sortFindings,
} from '@/lib/scan/security-score';
import type { SecurityScore, Severity } from '@/lib/scan/types';

/** High severity is the one place ember appears outside the poorest scores. */
const SEVERITY_STYLE: Record<Severity, string> = {
  high: 'border-ember/35 bg-ember/10 text-ember',
  medium: 'border-amber/30 bg-amber/10 text-amber',
  low: 'border-white/[0.08] bg-white/[0.03] text-ash-light',
};

const SEVERITY_ICON: Record<Severity, string> = {
  high: 'border-ember/30 bg-ember/10 text-ember',
  medium: 'border-amber/25 bg-amber/10 text-amber',
  low: 'border-white/[0.08] bg-white/[0.04] text-ash-light',
};

/**
 * Security observations (spec §5).
 *
 * Framed as observations throughout: the disclaimer is rendered inline, not
 * tucked into a tooltip, because these checks are a narrow slice of a site's
 * posture and a passing score is not a clean bill of health.
 */
export function SecurityFindingsCard({ score }: { readonly score: SecurityScore }) {
  const warnings = countWarnings(score.findings);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <ScoreDial score={score.total} label="Security observations" size={96} />
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-ash">
        <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ash-dim" />
        <span>{SECURITY_DISCLAIMER}</span>
      </p>

      <p className="technical mt-4 flex items-center gap-2 text-xs text-ash">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${warnings === 0 ? 'bg-verdigris-bright' : 'bg-amber'}`}
        />
        {warnings === 0
          ? 'No potential issues found by these checks'
          : `${warnings} potential ${warnings === 1 ? 'issue' : 'issues'} found`}
      </p>

      <ul className="mt-3 space-y-1.5">
        {sortFindings(score.findings).map((finding, index) => {
          const isPass = finding.status === 'pass';
          return (
            <motion.li
              key={finding.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.04, ease: EASE_OUT }}
              className="surface-inset flex gap-3 px-3 py-2.5"
            >
              <span
                aria-hidden="true"
                className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isPass
                    ? 'border-verdigris-bright/25 bg-verdigris-bright/10 text-verdigris-bright'
                    : SEVERITY_ICON[finding.severity]
                }`}
              >
                {isPass ? <CheckIcon className="h-3 w-3" /> : <WarnIcon className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`font-body text-xs font-medium ${isPass ? 'text-ash-light' : 'text-parchment'}`}>
                    {finding.title}
                  </p>
                  {finding.status === 'warn' ? (
                    <span className={`chip ${SEVERITY_STYLE[finding.severity]}`}>
                      {SEVERITY_LABEL[finding.severity]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ash">{finding.description}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

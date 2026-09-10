'use client';

import { ScoreDial } from '@/components/privacy/score-dial';
import {
  SECURITY_DISCLAIMER,
  SEVERITY_LABEL,
  countWarnings,
  sortFindings,
} from '@/lib/scan/security-score';
import type { SecurityScore, Severity } from '@/lib/scan/types';

const SEVERITY_STYLE: Record<Severity, string> = {
  high: 'border-amber bg-amber-dim/20 text-amber',
  medium: 'border-amber-dim bg-amber-dim/15 text-amber',
  low: 'border-ink-edge bg-ink text-ash-light',
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

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <ScoreDial score={score.total} label="Security observations" />

      <p className="mt-3 text-xs leading-relaxed text-ash">{SECURITY_DISCLAIMER}</p>

      <p className="technical mt-3 text-xs text-ash-dim">
        {warnings === 0
          ? 'No potential issues found by these checks'
          : `${warnings} potential ${warnings === 1 ? 'issue' : 'issues'} found`}
      </p>

      <ul className="mt-3 space-y-1.5">
        {sortFindings(score.findings).map((finding) => (
          <li key={finding.id} className="rounded-md border border-ink-edge bg-ink px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2 font-body text-xs text-parchment">
                <span
                  aria-hidden="true"
                  className={finding.status === 'pass' ? 'text-verdigris' : 'text-amber'}
                >
                  {finding.status === 'pass' ? '✓' : '⚠'}
                </span>
                {finding.title}
              </p>
              {finding.status === 'warn' ? (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs ${SEVERITY_STYLE[finding.severity]}`}
                >
                  {SEVERITY_LABEL[finding.severity]}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ash">{finding.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

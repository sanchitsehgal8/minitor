/**
 * Security score, derived from observed findings (spec §5).
 *
 * Deliberately framed as observations rather than a verdict: these checks look
 * at headers and cookie flags, which is a narrow slice of a site's security
 * posture. A site can pass every check here and still be compromised, so the
 * copy never says "safe" — see SECURITY_DISCLAIMER, which the UI must render
 * alongside the number.
 */

import type { SecurityFinding, SecurityScore, Severity } from '@/lib/scan/types';

/** Points deducted per failed check, by severity. */
const SEVERITY_PENALTY: Readonly<Record<Severity, number>> = {
  low: 4,
  medium: 9,
  high: 20,
};

export const SECURITY_DISCLAIMER =
  'These are observations from a limited set of checks on headers and cookie flags in this scan. They are not an audit, and passing them does not mean a site is secure.';

export const SEVERITY_LABEL: Readonly<Record<Severity, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function calculateSecurityScore(findings: readonly SecurityFinding[]): SecurityScore {
  const penalty = findings
    .filter((finding) => finding.status === 'warn')
    .reduce((sum, finding) => sum + SEVERITY_PENALTY[finding.severity], 0);

  return {
    total: Math.max(0, Math.min(100, 100 - penalty)),
    findings,
  };
}

/** Warnings first, most severe at the top — the actionable items lead. */
export function sortFindings(findings: readonly SecurityFinding[]): readonly SecurityFinding[] {
  const order: Readonly<Record<Severity, number>> = { high: 0, medium: 1, low: 2 };
  return [...findings].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'warn' ? -1 : 1;
    return order[a.severity] - order[b.severity];
  });
}

export function countWarnings(findings: readonly SecurityFinding[]): number {
  return findings.filter((finding) => finding.status === 'warn').length;
}

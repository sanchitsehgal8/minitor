/**
 * The stages a scan moves through (spec §2).
 *
 * Durations live here rather than in the component so the progress UI stays
 * presentational, and so a real backend could report genuine stage transitions
 * against the same list.
 */

export type ScanStage = {
  readonly id: string;
  readonly label: string;
  /** Simulated duration in ms. Roughly 3.4s total. */
  readonly durationMs: number;
};

export const SCAN_STAGES: readonly ScanStage[] = [
  { id: 'init', label: 'Initialising scan', durationMs: 320 },
  { id: 'load', label: 'Loading website profile', durationMs: 420 },
  { id: 'requests', label: 'Analysing network requests', durationMs: 620 },
  { id: 'trackers', label: 'Detecting known trackers', durationMs: 560 },
  { id: 'cookies', label: 'Analysing cookies', durationMs: 400 },
  { id: 'security', label: 'Checking security configuration', durationMs: 480 },
  { id: 'score', label: 'Calculating privacy score', durationMs: 380 },
  { id: 'report', label: 'Generating report', durationMs: 260 },
];

export const TOTAL_SCAN_MS = SCAN_STAGES.reduce((sum, stage) => sum + stage.durationMs, 0);

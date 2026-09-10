'use client';

import { scoreBand } from '@/lib/scan/privacy-score';

/**
 * A score as a ring. Presentational only — the number and its band arrive
 * already computed by the scoring service.
 */
const BAND_COLOR: Record<ReturnType<typeof scoreBand>, string> = {
  strong: '#3E8E7E',
  mixed: '#D8A24A',
  poor: '#A87A33',
};

export function ScoreDial({
  score,
  label,
  size = 84,
}: {
  readonly score: number;
  readonly label: string;
  readonly size?: number;
}) {
  const band = scoreBand(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${score} out of 100`}
        className="shrink-0"
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#252A35" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={BAND_COLOR[band]}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-parchment font-mono"
          style={{ fontSize: size * 0.28 }}
        >
          {score}
        </text>
      </svg>

      <div className="min-w-0">
        <p className="font-body text-sm font-medium leading-tight text-parchment">{label}</p>
        <p className="technical text-xs text-ash">{score} / 100</p>
      </div>
    </div>
  );
}

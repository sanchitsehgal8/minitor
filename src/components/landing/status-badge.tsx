import { STATUS_LABEL, type ObjectiveStatus } from '@/components/landing/objectives';

/**
 * Status is carried by shape and text as well as colour, so it survives
 * greyscale and colour-blindness.
 */
const STYLES: Record<ObjectiveStatus, string> = {
  real: 'border-verdigris bg-verdigris-wash text-verdigris-dim',
  partial: 'border-ash-light bg-paper text-ash-dim',
  simulated: 'border-amber-dim bg-amber-wash text-amber-dim',
};

export function StatusBadge({
  status,
  className = '',
}: {
  readonly status: ObjectiveStatus;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${STYLES[status]} ${className}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

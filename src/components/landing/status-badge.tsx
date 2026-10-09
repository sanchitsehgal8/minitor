import { STATUS_LABEL, type ObjectiveStatus } from '@/components/landing/objectives';

/**
 * Status is carried by shape and text as well as colour, so it survives
 * greyscale and colour-blindness: a filled dot for working, a half dot for
 * partly working, a hollow ring for simulated.
 */
const STYLES: Record<ObjectiveStatus, string> = {
  real: 'border-verdigris-bright/30 bg-verdigris/10 text-verdigris-glow',
  partial: 'border-white/15 bg-white/[0.04] text-ash-light',
  simulated: 'border-amber/35 bg-amber/10 text-amber-glow',
};

function Glyph({ status }: { readonly status: ObjectiveStatus }) {
  if (status === 'real') {
    return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />;
  }
  if (status === 'partial') {
    return (
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full border border-current"
        style={{ background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)' }}
      />
    );
  }
  return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-current" />;
}

export function StatusBadge({
  status,
  className = '',
}: {
  readonly status: ObjectiveStatus;
  readonly className?: string;
}) {
  return (
    <span className={`chip gap-1.5 px-2.5 ${STYLES[status]} ${className}`}>
      <Glyph status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

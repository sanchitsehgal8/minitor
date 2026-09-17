'use client';

/**
 * The three states every list panel needs, in one place.
 *
 * They were previously inlined per panel, which is how they drifted: some
 * surfaced an error with no way to recover from it, leaving a reload as the
 * only option. Sharing them means a fix to the pattern reaches every panel.
 */

export function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  /** Omit only when the failed action genuinely cannot be repeated. */
  readonly onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-2 my-2 rounded-md border border-amber-dim/40 bg-amber-wash/5 px-3 py-2.5"
    >
      <p className="text-xs leading-relaxed text-amber">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-sm border border-amber-dim/50 px-2 py-0.5 font-mono text-xs text-amber transition-colors duration-150 hover:bg-amber-dim/20"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { readonly label?: string }) {
  // `role="status"` so the wait is announced rather than being silent.
  return (
    <p role="status" className="px-2 py-3 text-xs text-ash-dim">
      {label}
    </p>
  );
}

export function EmptyState({ children }: { readonly children: React.ReactNode }) {
  return <p className="px-2 py-3 text-xs leading-relaxed text-ash-dim">{children}</p>;
}

import Link from 'next/link';

/**
 * The MiniTor mark: three nested rings dropping toward a lit core — the layers
 * of an onion-routed packet, read in cross-section.
 */
export function LogoMark({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="minitor-mark" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8AF0D6" />
          <stop offset="1" stopColor="#3E8E7E" />
        </linearGradient>
        <radialGradient id="minitor-core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 15.2) scale(3.4)">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#8AF0D6" />
          <stop offset="1" stopColor="#3E8E7E" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.25" stroke="url(#minitor-mark)" strokeWidth="1.5" opacity="0.55" />
      <circle cx="12" cy="13.6" r="6.75" stroke="url(#minitor-mark)" strokeWidth="1.5" opacity="0.85" />
      <circle cx="12" cy="15.2" r="3.1" fill="url(#minitor-core)" />
    </svg>
  );
}

export function Logo({
  href = '/',
  className = '',
}: {
  readonly href?: string;
  readonly className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full text-parchment ${className}`}
    >
      <LogoMark className="h-6 w-6 transition-transform duration-500 ease-out group-hover:rotate-[20deg]" />
      <span className="font-display text-xl leading-none tracking-tight">MiniTor</span>
    </Link>
  );
}

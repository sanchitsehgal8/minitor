'use client';

import type { CSSProperties, ReactNode } from 'react';

import { MaskIcon, SearchIcon, WarnIcon } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/logo';

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
      className="mx-1 my-2 flex items-start gap-3 rounded-lg border border-amber/25 bg-amber/[0.06] px-3 py-3"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
        <WarnIcon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-amber-glow">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center rounded-full border border-amber/30 px-3 py-1 font-mono text-xs text-amber transition-colors duration-200 hover:border-amber/50 hover:bg-amber/10"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Skeleton rows rather than a bare "Loading…": the panel keeps the shape of
 * what is coming, so the list does not jump when it lands. The label is still
 * announced — `role="status"` with screen-reader text — because shimmer alone
 * says nothing to someone who cannot see it.
 */
export function LoadingState({
  label = 'Loading…',
  rows = 4,
}: {
  readonly label?: string;
  readonly rows?: number;
}) {
  return (
    <div role="status" className="space-y-1 px-1 py-1">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="h-8 w-8 shrink-0 rounded-md bg-white/[0.05]" />
          <span className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-2.5" style={{ width: `${72 - index * 9}%` }} />
            <Shimmer className="h-2 w-2/5" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Shimmer({
  className,
  style,
}: {
  readonly className: string;
  readonly style?: CSSProperties;
}) {
  return (
    <span
      className={`relative block overflow-hidden rounded-full bg-white/[0.06] ${className}`}
      style={style}
    >
      <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </span>
  );
}

export function EmptyState({
  children,
  icon,
}: {
  readonly children: ReactNode;
  /** Optional glyph shown in a ring above the copy. */
  readonly icon?: ReactNode;
}) {
  if (!icon) {
    return <p className="px-2 py-3 text-xs leading-relaxed text-ash">{children}</p>;
  }
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center sm:py-10">
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-ash-light shadow-lift">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(91,194,170,0.18),transparent)]"
        />
        <span className="relative">{icon}</span>
      </span>
      <p className="mt-4 max-w-[17rem] text-sm leading-relaxed text-ash">{children}</p>
    </div>
  );
}

/** Pill search input shared by the list panels. */
export function SearchField({
  id,
  label,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="group flex h-9 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 transition-[border-color,background-color,box-shadow] duration-300 ease-chrome hover:border-white/[0.12] focus-within:border-verdigris-bright/50 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_3px_rgba(91,194,170,0.12)]">
      <SearchIcon className="h-3.5 w-3.5 shrink-0 text-ash transition-colors duration-200 group-focus-within:text-verdigris-bright" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent font-body text-sm text-parchment placeholder:text-ash focus:outline-none"
      />
    </div>
  );
}

/**
 * A site's "favicon": its initial in a small tile. Real favicons would mean a
 * request to every site in the user's history just to draw a list — exactly
 * the kind of quiet third-party contact this browser exists to avoid — so the
 * mark is derived locally from the hostname instead.
 */
export function SiteMark({
  url,
  label,
  size = 'md',
  isPrivate = false,
}: {
  /** Full URL or bare hostname; app-relative paths render the MiniTor mark. */
  readonly url: string;
  /** Fallback text when no hostname can be read (e.g. a "New tab"). */
  readonly label?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly isPrivate?: boolean;
}) {
  const box = SIZES[size];
  const host = hostnameOf(url);
  const isOwn = url.startsWith('/') || host === 'minitor.local';

  if (isPrivate) {
    return (
      <span aria-hidden="true" className={`${box.frame} bg-amber/15 text-amber ring-1 ring-inset ring-amber/25`}>
        <MaskIcon className={box.icon} />
      </span>
    );
  }

  if (isOwn) {
    return (
      <span aria-hidden="true" className={`${box.frame} bg-verdigris/10 ring-1 ring-inset ring-verdigris-bright/20`}>
        <LogoMark className={box.icon} />
      </span>
    );
  }

  const letter = (siteName(host) || label || '·').charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${box.frame} bg-gradient-to-b from-white/[0.11] to-white/[0.03] font-display text-parchment ring-1 ring-inset ring-white/10`}
    >
      <span className={box.letter}>{letter}</span>
    </span>
  );
}

const SIZES = {
  sm: {
    frame: 'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px]',
    icon: 'h-3 w-3',
    letter: 'text-[11px] leading-none',
  },
  md: {
    frame: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
    icon: 'h-4 w-4',
    letter: 'text-lg leading-none',
  },
  lg: {
    frame: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
    icon: 'h-5 w-5',
    letter: 'text-2xl leading-none',
  },
} as const;

/**
 * The part of a hostname people recognise: `en.wikipedia.org` → `wikipedia`,
 * `www.bbc.co.uk` → `bbc`. A heuristic, not a public-suffix lookup — it only
 * picks a letter.
 */
function siteName(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  const second = parts[parts.length - 2] ?? '';
  const isCompoundSuffix = parts.length > 2 && COMPOUND_SUFFIX_LABELS.has(second);
  return (isCompoundSuffix ? parts[parts.length - 3] : second) ?? '';
}

const COMPOUND_SUFFIX_LABELS: ReadonlySet<string> = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

function hostnameOf(url: string): string {
  if (!url.includes('/') && !url.includes(':')) return url.toLowerCase();
  try {
    return new URL(url, 'https://minitor.local').hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** "3 min ago" for recent rows, a short date beyond a week. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '';
  const seconds = Math.round((at - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto', style: 'short' });
  if (abs < 45) return 'Just now';
  if (abs < 3_600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3_600), 'hour');
  if (abs < 604_800) return rtf.format(Math.round(seconds / 86_400), 'day');
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

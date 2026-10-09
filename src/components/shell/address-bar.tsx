'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LockIcon,
  MaskIcon,
  ReloadIcon,
  SearchIcon,
  StarIcon,
  UnlockIcon,
} from '@/components/ui/icons';
import { formatForDisplay } from '@/lib/privacy/url';

const UI_EASE = [0.32, 0.72, 0, 1] as const;
const SWEEP_MS = 700;
const BURST_RAYS = 8;

export function AddressBar({
  value,
  isSecure,
  canGoBack,
  canGoForward,
  isBookmarked,
  isPrivate,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onToggleBookmark,
}: {
  /** Committed URL for the active tab, or '' on the start page. */
  readonly value: string;
  readonly isSecure: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly isBookmarked: boolean;
  readonly isPrivate: boolean;
  readonly onNavigate: (input: string) => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onReload: () => void;
  readonly onToggleBookmark: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Reflect navigation that came from elsewhere (a link, back/forward, the
  // start page) but never overwrite what the user is mid-way through typing.
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  /*
   * Load sweep. A cross-origin iframe reports nothing useful about its own
   * progress, so this is a fixed-length acknowledgement that the commit
   * happened — not a progress bar, and deliberately too short to pretend to
   * be one.
   */
  const [sweep, setSweep] = useState(0);
  const isFirstValue = useRef(true);
  useEffect(() => {
    if (isFirstValue.current) {
      isFirstValue.current = false;
      return;
    }
    if (value.length > 0) setSweep((count) => count + 1);
  }, [value]);

  const [sweepVisible, setSweepVisible] = useState(false);
  useEffect(() => {
    if (sweep === 0) return;
    setSweepVisible(true);
    const timer = setTimeout(() => setSweepVisible(false), SWEEP_MS);
    return () => clearTimeout(timer);
  }, [sweep]);

  // Counters rather than booleans so each click replays its animation.
  const [reloadTurns, setReloadTurns] = useState(0);
  const [burst, setBurst] = useState(0);

  const hasTarget = value.length > 0;
  const tone = !hasTarget ? 'idle' : isSecure ? 'secure' : 'insecure';

  return (
    <div className="flex items-center gap-1 px-2 pb-2 sm:gap-2 sm:px-3">
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back"
          className="chrome-button"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Go forward"
          className="chrome-button"
        >
          <ArrowRightIcon />
        </button>
        <button
          type="button"
          onClick={() => {
            setReloadTurns((turns) => turns + 1);
            setSweep((count) => count + 1);
            onReload();
          }}
          disabled={!hasTarget}
          aria-label="Reload this page"
          className="chrome-button"
        >
          <motion.span
            className="flex"
            animate={{ rotate: reloadTurns * 360 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReloadIcon />
          </motion.span>
        </button>
      </div>

      <form
        className={`relative flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border bg-white/[0.035] px-1.5 transition-[border-color,background-color,box-shadow] duration-300 ease-chrome hover:bg-white/[0.05] has-[input:focus]:bg-white/[0.06] ${
          isPrivate
            ? 'border-amber/20 has-[input:focus]:border-amber/60 has-[input:focus]:shadow-[0_0_0_4px_rgba(216,162,74,0.14),0_10px_30px_-12px_rgba(216,162,74,0.45)]'
            : 'border-white/[0.08] has-[input:focus]:border-verdigris-bright/60 has-[input:focus]:shadow-[0_0_0_4px_rgba(91,194,170,0.14),0_10px_30px_-12px_rgba(91,194,170,0.5)]'
        }`}
        onSubmit={(event) => {
          event.preventDefault();
          setIsEditing(false);
          onNavigate(draft);
        }}
      >
        {/* Padlock: verdigris for https, amber for http (spec §6). */}
        <span
          className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2 font-body text-xs font-medium transition-colors duration-300 ${
            tone === 'secure'
              ? 'bg-verdigris/15 text-verdigris-bright'
              : tone === 'insecure'
                ? 'bg-amber/15 text-amber'
                : 'text-ash'
          }`}
          title={
            !hasTarget
              ? 'Nothing loaded'
              : isSecure
                ? 'Encrypted connection (https)'
                : 'Not encrypted (http)'
          }
        >
          {/* Fixed box so the cross-fading glyphs overlap instead of reflowing. */}
          <span className="relative h-3.5 w-3.5 shrink-0">
            <AnimatePresence initial={false}>
              <motion.span
                key={tone}
                className="absolute inset-0 flex"
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.22, ease: UI_EASE }}
              >
                {tone === 'idle' ? (
                  <SearchIcon className="h-3.5 w-3.5" />
                ) : tone === 'secure' ? (
                  <LockIcon className="h-3.5 w-3.5" />
                ) : (
                  <UnlockIcon className="h-3.5 w-3.5" />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
          {hasTarget ? (
            <span aria-hidden="true" className="hidden md:inline">
              {isSecure ? 'Secure' : 'Not secure'}
            </span>
          ) : null}
          <span className="sr-only">
            {!hasTarget ? 'No page loaded' : isSecure ? 'Secure, https' : 'Not secure, http'}
          </span>
        </span>

        <label htmlFor="address" className="sr-only">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={isEditing ? draft : formatForDisplay(draft)}
          placeholder="Search, or type a URL"
          onFocus={(event) => {
            setIsEditing(true);
            setDraft(value);
            event.currentTarget.select();
          }}
          onBlur={() => setIsEditing(false)}
          onChange={(event) => setDraft(event.target.value)}
          className="technical min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-ash focus:outline-none"
        />

        {isPrivate ? (
          <span
            className="hidden h-6 shrink-0 items-center gap-1 rounded-full bg-amber/10 px-2 font-mono text-xs text-amber sm:flex"
            title="Private tab"
          >
            <MaskIcon className="h-3.5 w-3.5" />
            <span aria-hidden="true">Private</span>
            <span className="sr-only">Private tab</span>
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (!isBookmarked) setBurst((count) => count + 1);
            onToggleBookmark();
          }}
          disabled={!hasTarget || isPrivate}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
          title={
            isPrivate
              ? 'Private tabs do not save bookmarks'
              : isBookmarked
                ? 'Remove bookmark'
                : 'Save bookmark'
          }
          className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:text-ash-dim disabled:hover:bg-transparent ${
            isBookmarked ? 'text-amber-glow' : 'text-ash-light hover:bg-white/[0.07] hover:text-white'
          }`}
        >
          <motion.span
            key={burst}
            className="flex"
            initial={burst === 0 ? false : { scale: 0.35, rotate: -35 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          >
            <StarIcon filled={isBookmarked} />
          </motion.span>
          {burst > 0 && !prefersReducedMotion ? <StarBurst key={`burst-${burst}`} /> : null}
        </button>

        {/* The sweep sits on the pill's lower edge, clipped to its curve. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 -bottom-px h-px overflow-hidden"
        >
          <AnimatePresence>
            {sweepVisible && !prefersReducedMotion ? (
              <motion.span
                key={sweep}
                className={`absolute inset-y-0 left-0 w-1/3 ${
                  isPrivate
                    ? 'bg-gradient-to-r from-transparent via-amber-glow to-transparent'
                    : 'bg-gradient-to-r from-transparent via-verdigris-glow to-transparent'
                }`}
                initial={{ x: '-100%', opacity: 1 }}
                animate={{ x: '300%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: SWEEP_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
              />
            ) : null}
          </AnimatePresence>
        </span>
      </form>
    </div>
  );
}

/** A ring and a scatter of sparks: one-shot, mounted per click. */
function StarBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute inset-0 rounded-full border border-amber-glow"
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
      {Array.from({ length: BURST_RAYS }, (_, index) => {
        const angle = (index / BURST_RAYS) * Math.PI * 2;
        return (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 h-1 w-1 rounded-full bg-amber-glow"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 16, y: Math.sin(angle) * 16, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}

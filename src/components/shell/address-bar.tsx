'use client';

import { useEffect, useState } from 'react';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LockIcon,
  ReloadIcon,
  StarIcon,
  UnlockIcon,
} from '@/components/ui/icons';
import { formatForDisplay } from '@/lib/privacy/url';

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

  // Reflect navigation that came from elsewhere (a link, back/forward, the
  // start page) but never overwrite what the user is mid-way through typing.
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const hasTarget = value.length > 0;

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div className="flex shrink-0 items-center gap-0.5">
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
          onClick={onReload}
          disabled={!hasTarget}
          aria-label="Reload this page"
          className="chrome-button"
        >
          <ReloadIcon />
        </button>
      </div>

      <form
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-ink-edge bg-ink-raised px-2.5 py-1.5 focus-within:border-verdigris"
        onSubmit={(event) => {
          event.preventDefault();
          setIsEditing(false);
          onNavigate(draft);
        }}
      >
        {/* Padlock: verdigris for https, amber for http (spec §6). */}
        <span
          className={`shrink-0 ${hasTarget ? (isSecure ? 'text-verdigris' : 'text-amber') : 'text-ash-dim'}`}
          title={
            !hasTarget
              ? 'Nothing loaded'
              : isSecure
                ? 'Encrypted connection (https)'
                : 'Not encrypted (http)'
          }
        >
          {isSecure || !hasTarget ? <LockIcon /> : <UnlockIcon />}
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
          className="technical min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-ash-dim focus:outline-none"
        />

        <button
          type="button"
          onClick={onToggleBookmark}
          disabled={!hasTarget || isPrivate}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
          title={
            isPrivate
              ? 'Private tabs do not save bookmarks'
              : isBookmarked
                ? 'Remove bookmark'
                : 'Save bookmark'
          }
          className={`shrink-0 rounded-sm p-0.5 transition-colors duration-150 disabled:cursor-not-allowed disabled:text-ash-dim ${
            isBookmarked ? 'text-amber' : 'text-ash-light hover:text-white'
          }`}
        >
          <StarIcon filled={isBookmarked} />
        </button>
      </form>
    </div>
  );
}

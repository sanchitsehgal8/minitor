'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { CheckIcon, CookieIcon, ReloadIcon } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/panel-states';

/**
 * Objective 3, partial (spec §1). Shows the first-party cookies this app sets,
 * which is genuinely all JavaScript can see: an httpOnly session cookie is
 * hidden from `document.cookie` by design, and cookies inside a cross-origin
 * iframe belong to a different origin entirely. The panel says so rather than
 * presenting an empty list as "no trackers found".
 */

type CookieRow = { readonly name: string; readonly value: string };

function readVisibleCookies(): readonly CookieRow[] {
  if (typeof document === 'undefined' || document.cookie.length === 0) return [];
  return document.cookie
    .split(';')
    .map((pair) => {
      const [name = '', ...rest] = pair.trim().split('=');
      return { name, value: rest.join('=') };
    })
    .filter((row) => row.name.length > 0);
}

export function CookiesPanel({ isActive }: { readonly isActive: boolean }) {
  const [cookies, setCookies] = useState<readonly CookieRow[]>([]);
  const [refreshes, setRefreshes] = useState(0);

  const refresh = useCallback(() => setCookies(readVisibleCookies()), []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  function clearVisible() {
    for (const cookie of cookies) {
      document.cookie = `${cookie.name}=; Max-Age=0; path=/`;
    }
    refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-3 pb-3 pt-3">
        <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] px-3.5 py-3">
          <span
            aria-hidden="true"
            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ash-light ring-1 ring-inset ring-white/10">
              <CookieIcon className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-ash-light">
              <span className="font-medium text-parchment">Only MiniTor’s own cookies appear here.</span>{' '}
              Your login cookie is <span className="technical text-parchment">httpOnly</span>, so
              JavaScript cannot read it — including this panel’s. Cookies set by an embedded page
              belong to that site’s origin and are invisible to this one. Browsers enforce that
              separation; it is not something this demo can opt out of.
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
          <span className="technical tabular text-xs text-ash">{cookies.length} readable</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setRefreshes((count) => count + 1);
                refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs text-ash transition-colors duration-200 hover:bg-white/[0.06] hover:text-parchment"
            >
              <motion.span
                aria-hidden="true"
                className="flex"
                animate={{ rotate: refreshes * 360 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <ReloadIcon className="h-3 w-3" />
              </motion.span>
              Refresh
            </button>
            {cookies.length > 0 ? (
              <button
                type="button"
                onClick={clearVisible}
                className="rounded-full px-2.5 py-1 font-mono text-xs text-ash transition-colors duration-200 hover:bg-amber/10 hover:text-amber"
              >
                Clear these
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2.5 py-2.5">
        {cookies.length === 0 ? (
          <EmptyState icon={<CheckIcon className="h-5 w-5 text-verdigris-bright" />}>
            No JavaScript-readable cookies. That is the expected result — MiniTor keeps your session
            in an httpOnly cookie precisely so that scripts cannot reach it.
          </EmptyState>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {cookies.map((cookie) => (
                <motion.li
                  key={cookie.name}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                  className="surface-inset px-3 py-2"
                >
                  <span className="technical block truncate text-sm text-parchment">{cookie.name}</span>
                  <span className="technical mt-0.5 block truncate text-xs text-ash">
                    {cookie.value || '(empty)'}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

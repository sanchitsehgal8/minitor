'use client';

import { useCallback, useEffect, useState } from 'react';

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
      <div className="border-b border-ink-edge px-3 py-3">
        <p className="rounded-md border border-ash-dim bg-ink-raised px-2.5 py-2 text-xs leading-relaxed text-ash-light">
          <span className="font-medium text-parchment">Only MiniTor’s own cookies appear here.</span>{' '}
          Your login cookie is <span className="technical">httpOnly</span>, so JavaScript cannot read
          it — including this panel’s. Cookies set by an embedded page belong to that site’s origin
          and are invisible to this one. Browsers enforce that separation; it is not something this
          demo can opt out of.
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="technical text-xs text-ash-dim">{cookies.length} readable</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={refresh}
              className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-ash transition-colors duration-150 hover:text-parchment"
            >
              Refresh
            </button>
            {cookies.length > 0 ? (
              <button
                type="button"
                onClick={clearVisible}
                className="rounded-sm px-1.5 py-0.5 font-mono text-xs text-ash transition-colors duration-150 hover:text-amber"
              >
                Clear these
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="log-scroll flex-1 overflow-y-auto px-2 py-2">
        {cookies.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-ash-dim">
            No JavaScript-readable cookies. That is the expected result — MiniTor keeps your session
            in an httpOnly cookie precisely so that scripts cannot reach it.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {cookies.map((cookie) => (
              <li key={cookie.name} className="rounded-md px-2 py-1.5 hover:bg-ink-raised">
                <span className="technical block truncate text-xs text-parchment">{cookie.name}</span>
                <span className="technical block truncate text-xs text-ash-dim">
                  {cookie.value || '(empty)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

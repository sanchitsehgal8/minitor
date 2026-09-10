'use client';

import type { CookieFinding, CookieType } from '@/lib/scan/types';

const TYPE_LABEL: Record<CookieType, string> = {
  analytics: 'Analytics',
  advertising: 'Advertising',
  functional: 'Functional',
  session: 'Session',
};

/** Cookie findings with their security flags and warnings (spec §9). */
export function CookieAnalysis({ cookies }: { readonly cookies: readonly CookieFinding[] }) {
  if (cookies.length === 0) {
    return (
      <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
        <h3 className="font-body text-sm font-medium text-parchment">Cookies</h3>
        <p className="mt-1.5 text-xs text-ash">No cookies were observed in this scan.</p>
      </section>
    );
  }

  const thirdPartyTracking = cookies.filter(
    (cookie) => !cookie.firstParty && (cookie.type === 'analytics' || cookie.type === 'advertising'),
  ).length;

  return (
    <section className="rounded-lg border border-ink-edge bg-ink-raised p-4">
      <h3 className="font-body text-sm font-medium text-parchment">Cookies</h3>
      <p className="mt-1 text-xs text-ash">
        {cookies.length} observed
        {thirdPartyTracking > 0
          ? `, of which ${thirdPartyTracking} ${thirdPartyTracking === 1 ? 'is a third-party tracking cookie' : 'are third-party tracking cookies'}.`
          : '. None are third-party tracking cookies.'}
      </p>

      <ul className="mt-3 space-y-1.5">
        {cookies.map((cookie) => (
          <li key={`${cookie.domain}-${cookie.name}`} className="rounded-md border border-ink-edge bg-ink px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="technical text-xs text-parchment">{cookie.name}</span>
              <span className="font-mono text-xs text-ash-dim">{TYPE_LABEL[cookie.type]}</span>
            </div>

            <p className="technical mt-0.5 truncate text-xs text-ash-dim">{cookie.domain}</p>

            <div className="mt-2 flex flex-wrap gap-1">
              <Flag label={cookie.firstParty ? 'First-party' : 'Third-party'} tone={cookie.firstParty ? 'neutral' : 'warn'} />
              <Flag label="Secure" tone={cookie.secure ? 'good' : 'warn'} present={cookie.secure} />
              <Flag label="HttpOnly" tone={cookie.httpOnly ? 'good' : 'warn'} present={cookie.httpOnly} />
            </div>

            {cookie.warnings.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {cookie.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-1.5 text-xs leading-relaxed text-amber">
                    <span aria-hidden="true">⚠</span>
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Flag({
  label,
  tone,
  present = true,
}: {
  readonly label: string;
  readonly tone: 'good' | 'warn' | 'neutral';
  readonly present?: boolean;
}) {
  const style =
    tone === 'good'
      ? 'border-verdigris-dim text-verdigris'
      : tone === 'warn'
        ? 'border-amber-dim text-amber'
        : 'border-ink-edge text-ash-light';

  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${style}`}>
      {present ? label : `No ${label}`}
    </span>
  );
}

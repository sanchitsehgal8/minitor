'use client';

import { motion } from 'framer-motion';

import { CARD, CardHeader, EASE_OUT } from '@/components/privacy/privacy-primitives';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { CheckIcon, CookieIcon, WarnIcon } from '@/components/ui/icons';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type { CookieFinding, CookieType } from '@/lib/scan/types';

const TYPE_LABEL: Record<CookieType, string> = {
  analytics: 'Analytics',
  advertising: 'Advertising',
  functional: 'Functional',
  session: 'Session',
};

/**
 * Type colours follow the request categories: tracking types in the amber
 * family, the site's own working cookies in verdigris and ash.
 */
const TYPE_COLOR: Record<CookieType, string> = {
  analytics: '#D8A24A',
  advertising: '#A9523C',
  functional: '#5BC2AA',
  session: '#8A8F98',
};

const TYPE_ORDER: readonly CookieType[] = ['analytics', 'advertising', 'functional', 'session'];

/** Cookie findings with their security flags and warnings (spec §9). */
export function CookieAnalysis({ cookies }: { readonly cookies: readonly CookieFinding[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (cookies.length === 0) {
    return (
      <section className={CARD}>
        <CardHeader
          icon={<CookieIcon className="h-3.5 w-3.5" />}
          title="Cookies"
          description="No cookies were observed in this scan."
        />
      </section>
    );
  }

  const thirdPartyTracking = cookies.filter(
    (cookie) => !cookie.firstParty && (cookie.type === 'analytics' || cookie.type === 'advertising'),
  ).length;

  const byType = TYPE_ORDER.map((type) => ({
    type,
    count: cookies.filter((cookie) => cookie.type === type).length,
  })).filter((entry) => entry.count > 0);

  return (
    <section className={CARD}>
      <CardHeader
        icon={<CookieIcon className="h-3.5 w-3.5" />}
        title="Cookies"
        description={
          <>
            {cookies.length} observed
            {thirdPartyTracking > 0
              ? `, of which ${thirdPartyTracking} ${thirdPartyTracking === 1 ? 'is a third-party tracking cookie' : 'are third-party tracking cookies'}.`
              : '. None are third-party tracking cookies.'}
          </>
        }
      />

      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="font-display text-5xl leading-none text-white" aria-hidden="true">
          <AnimatedNumber value={cookies.length} />
        </p>
        <p className="eyebrow pb-1 text-right">By type</p>
      </div>

      {/* Composition by type; the legend underneath carries the counts. */}
      <div aria-hidden="true" className="mt-3 flex h-2.5 w-full gap-0.5">
        {byType.map((entry, index) => (
          <motion.div
            key={entry.type}
            className="h-full rounded-full"
            style={{ backgroundColor: TYPE_COLOR[entry.type] }}
            initial={prefersReducedMotion ? false : { width: '0%', opacity: 0 }}
            animate={{ width: `${(entry.count / cookies.length) * 100}%`, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 + index * 0.08, ease: EASE_OUT }}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {byType.map((entry) => (
          <li key={entry.type} className="flex items-center gap-1.5 text-xs text-ash">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: TYPE_COLOR[entry.type] }} />
            {TYPE_LABEL[entry.type]}
            <span className="technical tabular text-parchment">{entry.count}</span>
          </li>
        ))}
      </ul>

      <ul className="mt-4 space-y-1.5">
        {cookies.map((cookie, index) => (
          <motion.li
            key={`${cookie.domain}-${cookie.name}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 + Math.min(index, 10) * 0.04, ease: EASE_OUT }}
            className="surface-inset relative overflow-hidden px-3 py-2.5 pl-4"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-2.5 left-0 w-0.5 rounded-full"
              style={{ backgroundColor: TYPE_COLOR[cookie.type] }}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="technical text-xs text-white">{cookie.name}</span>
              <span className="font-mono text-xs" style={{ color: TYPE_COLOR[cookie.type] }}>
                {TYPE_LABEL[cookie.type]}
              </span>
            </div>

            <p className="technical mt-0.5 truncate text-xs text-ash-dim">{cookie.domain}</p>

            <div className="mt-2 flex flex-wrap gap-1">
              <Flag label={cookie.firstParty ? 'First-party' : 'Third-party'} tone={cookie.firstParty ? 'neutral' : 'warn'} />
              <Flag label="Secure" tone={cookie.secure ? 'good' : 'warn'} present={cookie.secure} />
              <Flag label="HttpOnly" tone={cookie.httpOnly ? 'good' : 'warn'} present={cookie.httpOnly} />
            </div>

            {cookie.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {cookie.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-1.5 text-xs leading-relaxed text-ash-light">
                    <WarnIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </motion.li>
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
      ? 'border-verdigris-bright/20 bg-verdigris-bright/[0.07] text-verdigris-bright'
      : tone === 'warn'
        ? 'border-amber/25 bg-amber/[0.08] text-amber'
        : 'border-white/[0.08] bg-white/[0.03] text-ash-light';

  return (
    <span className={`chip ${style}`}>
      {tone === 'good' ? <CheckIcon className="h-3 w-3" /> : null}
      {tone === 'warn' ? <WarnIcon className="h-3 w-3" /> : null}
      {present ? label : `No ${label}`}
    </span>
  );
}

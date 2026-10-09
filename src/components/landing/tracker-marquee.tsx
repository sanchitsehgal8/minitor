import { AnimatedNumber } from '@/components/ui/animated-number';
import type { TrackerRule } from '@/lib/privacy/tracker-blocklist';

/**
 * The blocklist itself, scrolling past — the actual domains MiniTor matches
 * against, read from the same module the console and scanner use — beside the
 * three numbers that bound what the demo covers.
 */
export function TrackerMarquee({
  rules,
  stats,
}: {
  readonly rules: readonly TrackerRule[];
  readonly stats: readonly { readonly label: string; readonly value: number }[];
}) {
  // Doubled so the -50% translate loops seamlessly.
  const loop = [...rules, ...rules];

  return (
    <section aria-label="Blocklist and scope" className="relative border-y border-white/[0.06] bg-ink-sunken/60">
      <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/[0.06] px-5 py-10">
        {stats.map((stat) => (
          <div key={stat.label} className="px-3 py-3 first:pl-0 sm:px-8">
            <p className="font-display text-4xl text-white sm:text-5xl">
              <AnimatedNumber value={stat.value} />
            </p>
            <p className="mt-2 text-xs text-ash sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mask-fade-x relative overflow-hidden border-t border-white/[0.06] py-4" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {loop.map((rule, index) => (
            <span
              key={`${rule.domain}${rule.pathPrefix ?? ''}-${index}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  rule.category === 'advertising' || rule.category === 'fingerprinting'
                    ? 'bg-amber'
                    : 'bg-amber-glow/70'
                }`}
              />
              <span className="technical text-xs text-ash-light line-through decoration-amber/60">
                {rule.domain}
                {rule.pathPrefix ?? ''}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ash-dim">
                {rule.category}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

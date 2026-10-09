import Link from 'next/link';

import { Reveal } from '@/components/landing/reveal';
import { ArrowRightIcon } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/logo';

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return `${parts[0]?.charAt(0) ?? ''}${parts[parts.length - 1]?.charAt(0) ?? ''}`.toUpperCase();
}

/** The call to action, the team, and the footer. */
export function Closing({ team }: { readonly team: readonly string[] }) {
  return (
    <>
      <section id="team" className="grain relative isolate scroll-mt-16 overflow-hidden pb-20 pt-32">
        {/* Concentric layers — the onion again, quietly turning. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">
          <div className="relative mt-[-6rem] h-[52rem] w-[52rem] max-w-none">
            <div className="absolute inset-[32%] rounded-full bg-verdigris/25 blur-[90px]" />
            {[0, 12, 24, 36].map((inset, index) => (
              <div
                key={inset}
                className={`absolute rounded-full border ${
                  index % 2 === 0 ? 'border-white/[0.06]' : 'animate-spin-slow border-dashed border-verdigris-bright/15'
                }`}
                style={{ inset: `${inset}%` }}
              />
            ))}
          </div>
        </div>

        <Reveal className="mx-auto max-w-3xl px-5 text-center">
          <LogoMark className="mx-auto h-12 w-12" />
          <h2 className="mt-8 font-display text-5xl text-white sm:text-6xl">
            Try the <span className="italic text-verdigris-glow">browser shell</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ash-light">
            Create an account to get your own history, bookmarks and website scans. They persist
            across sessions and devices — except anything you open in a private tab, which is never
            written down.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create an account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              Log in
            </Link>
          </div>
        </Reveal>

        <div className="mx-auto mt-32 grid max-w-6xl gap-10 border-t border-white/[0.06] px-5 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Reveal>
            <p className="eyebrow">Built by</p>
            <p className="mt-4 font-display text-3xl text-white">
              Thapar Institute of Engineering and Technology
            </p>
          </Reveal>
          <ul className="grid gap-3 sm:grid-cols-3">
            {team.map((member, index) => (
              <li key={member}>
                <Reveal delay={index * 0.08} className="surface flex h-full items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-verdigris-glow/30 to-verdigris-dim/30 font-mono text-xs text-verdigris-glow ring-1 ring-verdigris-bright/30">
                    {initials(member)}
                  </span>
                  <span className="text-base text-parchment">{member}</span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <p className="flex items-center gap-2.5 text-sm text-ash">
            <LogoMark className="h-4 w-4" />
            MiniTor — a student project. Not a substitute for Tor Browser.
          </p>
          <p className="technical text-xs text-ash-dim">web demo</p>
        </div>
      </footer>
    </>
  );
}

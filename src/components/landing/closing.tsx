import Link from 'next/link';

import { Reveal } from '@/components/landing/reveal';
import { ArrowRightIcon } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/logo';

/** The call to action, the team, and the footer. */
export function Closing({ team }: { readonly team: readonly string[] }) {
  return (
    <>
      <section id="team" className="relative scroll-mt-16 pb-20 pt-28">
        <div className="mx-auto grid max-w-6xl gap-16 px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Reveal>
            <h2 className="font-display text-5xl text-white sm:text-6xl">Try the browser shell</h2>
            <p className="mt-6 max-w-xl text-lg text-ash-light">
              Create an account to get your own history, bookmarks and website scans. They persist
              across sessions and devices — except anything you open in a private tab, which is
              never written down.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Create an account
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                Log in
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:pt-3">
            <h2 className="text-sm text-ash">Built by</h2>
            <ul className="mt-4">
              {team.map((member) => (
                <li key={member} className="border-b border-white/[0.07] py-3 text-lg text-parchment">
                  {member}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-base text-ash">Thapar Institute of Engineering and Technology</p>
          </Reveal>
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

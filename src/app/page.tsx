import Link from 'next/link';

import { ArchitectureDiagram } from '@/components/landing/architecture-diagram';
import { ChromeReplica } from '@/components/landing/chrome-replica';
import { OBJECTIVES } from '@/components/landing/objectives';
import { StatusBadge } from '@/components/landing/status-badge';
import { blocklistSize } from '@/lib/privacy/tracker-blocklist';
import { EMBEDDABLE_SITES } from '@/lib/privacy/embeddable-sites';

const TEAM = [
  'Krishiv Grag',
  'Sanchit Kumar Sharma',
  'Sanchit Shegal',
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-xl text-ink">MiniTor</span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Create an account
          </Link>
        </nav>
      </header>

      {/* Hero: headline left, live chrome replica right-of-centre (spec §4). */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-10 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
              A browser that shows you what it blocks.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ash-dim">
              MiniTor is a privacy-focused browser experience. This is the web demo: real tabs, real
              accounts, real HTTPS enforcement — and a privacy console that tells you plainly which
              parts are genuine and which are a simulation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary">
                Create an account
              </Link>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
            </div>
            <p className="mt-6 max-w-md text-sm text-ash-dim">
              Four of the five original objectives work for real here. The fifth needs access a
              hosted web page cannot have. We say which is which on this page and inside the app.
            </p>
          </div>

          <div className="lg:pl-6">
            <ChromeReplica />
          </div>
        </div>
      </section>

      {/* Objectives as a plain feature list — not a numbered sequence. */}
      <section className="border-t border-ash-light bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl font-display text-3xl text-ink">What works, and what doesn’t</h2>
          <p className="mt-3 max-w-2xl text-base text-ash-dim">
            A hosted page cannot inspect the network traffic of a site it embeds — browsers prevent
            it deliberately. Rather than fake the parts that need that access, MiniTor labels them.
          </p>

          <ul className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {OBJECTIVES.map((objective) => (
              <li key={objective.title} className="border-t border-ash-light pt-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-body text-lg font-medium text-ink">{objective.title}</h3>
                  <StatusBadge status={objective.status} />
                </div>
                <p className="mt-2 text-base text-ash-dim">{objective.what}</p>
                {objective.caveat ? (
                  <p className="mt-2 border-l-2 border-amber pl-3 text-sm text-ash-dim">
                    {objective.caveat}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <dl className="mt-14 grid gap-6 border-t border-ash-light pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ash-dim">Tracker domains on the blocklist</dt>
              <dd className="technical mt-1 text-2xl text-ink">{blocklistSize()}</dd>
            </div>
            <div>
              <dt className="text-sm text-ash-dim">Sites in the curated start page</dt>
              <dd className="technical mt-1 text-2xl text-ink">{EMBEDDABLE_SITES.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-ash-dim">Objectives genuinely functional</dt>
              <dd className="technical mt-1 text-2xl text-ink">4 of 5</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-t border-ash-light">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-display text-3xl text-ink">How it’s put together</h2>
          <p className="mt-3 max-w-2xl text-base text-ash-dim">
            Three layers. The rules live in the middle one, on their own, which is why the same
            HTTPS and private-mode checks can run in your browser and again on the server.
          </p>
          <div className="mt-10">
            <ArchitectureDiagram />
          </div>
        </div>
      </section>

      <section className="border-t border-ash-light bg-ink">
        <div className="on-ink mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl text-parchment">Built by</h2>
              <ul className="mt-6 space-y-3">
                {TEAM.map((member) => (
                  <li key={member} className="border-b border-ink-edge pb-3 text-lg text-parchment">
                    {member}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-base text-ash">
                Thapar Institute of Engineering and Technology
              </p>
            </div>

            <div className="flex flex-col justify-center rounded-lg border border-ink-edge bg-ink-raised p-8">
              <h2 className="font-display text-2xl text-parchment">Try the browser shell</h2>
              <p className="mt-3 text-base text-ash">
                Create an account to get your own history and bookmarks. They persist across
                sessions and devices — except anything you open in a private tab, which is never
                written down.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/signup" className="btn-primary">
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-ink-edge bg-transparent px-5 py-2.5 font-body text-sm font-medium text-parchment transition-colors duration-150 hover:border-ash-dim hover:bg-ink"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ash-light bg-parchment">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8">
          <p className="text-sm text-ash-dim">
            MiniTor — a student project. Not a substitute for Tor Browser.
          </p>
          <p className="technical text-xs text-ash">web demo</p>
        </div>
      </footer>
    </main>
  );
}

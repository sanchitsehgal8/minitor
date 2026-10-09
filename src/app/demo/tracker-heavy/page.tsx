import { TRACKER_BLOCKLIST } from '@/lib/privacy/tracker-blocklist';

export const metadata = { title: 'Tracker-heavy demo page — MiniTor' };

/**
 * A first-party page where blocking is REAL, not simulated (spec §1).
 *
 * Because MiniTor serves this page, it can send a Content-Security-Policy that
 * genuinely forbids every blocklisted origin — see `headers()` in
 * next.config.mjs. The script tags below are real requests to real tracker
 * hosts; the browser refuses them because of that CSP, and the refusals are
 * visible in the devtools network tab. This is the one place in the demo where
 * the privacy console's "blocked" label is literally true.
 *
 * It renders inside the browser frame as "a website", so it stays light and
 * paper-toned rather than taking on the app's dark chrome.
 */

const DEMO_TRACKERS = TRACKER_BLOCKLIST.slice(0, 6);

export default function TrackerHeavyDemoPage() {
  return (
    <main className="min-h-screen bg-paper text-ink [color-scheme:light]">
      <header className="border-b border-black/[0.07] bg-white/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3.5">
          <span className="font-display text-xl leading-none text-ink">MiniTor Demo</span>
          <span className="font-mono text-xs text-ash-dim">minitor.local</span>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-5 pb-20 pt-12 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-verdigris/40 bg-verdigris-wash px-3 py-1 font-mono text-xs text-verdigris-dim">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-verdigris" />
          Blocking is real on this page
        </p>

        <h1 className="mt-6 font-display text-4xl text-ink sm:text-5xl">
          A page that tries to track you
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink">
          MiniTor serves this page, so it can send a{' '}
          <code className="technical rounded-sm bg-black/[0.05] px-1 py-px text-[0.9em]">
            Content-Security-Policy
          </code>{' '}
          header that permits scripts from its own origin and nothing else. The tags below are
          genuine requests to genuine tracker hosts. Your browser refuses every one of them — open
          the network tab and you will see the failures.
        </p>

        <p className="mt-4 text-base leading-relaxed text-ash-dim">
          On third-party pages the privacy console can only simulate this, because a parent page
          cannot observe requests made inside a cross-origin frame. Here, it is the real thing.
        </p>

        <h2 className="mt-12 font-display text-2xl text-ink">Requests attempted</h2>
        <ol className="mt-4 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_0_rgba(0,0,0,0.03),0_12px_32px_-18px_rgba(11,14,19,0.25)]">
          {DEMO_TRACKERS.map((tracker, index) => (
            <li
              key={tracker.domain}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-black/[0.06] px-4 py-3 first:border-t-0"
            >
              <span aria-hidden="true" className="w-6 shrink-0 font-mono text-xs text-ash-dim">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="technical min-w-0 flex-1 text-sm text-ink">{tracker.domain}</span>
              <span className="font-mono text-xs text-ash-dim">
                {tracker.category} · {tracker.operator}
              </span>
            </li>
          ))}
        </ol>

        {/*
          Real script tags to real tracker origins. The CSP blocks them at the
          browser level; nothing here is faked or stubbed out.
        */}
        {DEMO_TRACKERS.map((tracker) => (
          <script key={tracker.domain} async src={`https://${tracker.domain}/minitor-demo.js`} />
        ))}

        <p className="mt-10 border-l-2 border-verdigris/50 pl-4 text-sm leading-relaxed text-ash-dim">
          The scripts requested above do not exist as files. What matters is that the browser never
          gets far enough to find out — the policy stops the connection first.
        </p>
      </article>
    </main>
  );
}

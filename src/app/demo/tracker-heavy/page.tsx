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
 */

const DEMO_TRACKERS = TRACKER_BLOCKLIST.slice(0, 6);

export default function TrackerHeavyDemoPage() {
  return (
    <main className="min-h-screen bg-paper px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="inline-flex items-center rounded-full border border-verdigris bg-verdigris-wash px-2.5 py-0.5 font-mono text-xs text-verdigris-dim">
          Blocking is real on this page
        </p>

        <h1 className="mt-4 font-display text-3xl text-ink">A page that tries to track you</h1>

        <p className="mt-4 text-base text-ink">
          MiniTor serves this page, so it can send a{' '}
          <span className="technical text-sm">Content-Security-Policy</span> header that permits
          scripts from its own origin and nothing else. The tags below are genuine requests to
          genuine tracker hosts. Your browser refuses every one of them — open the network tab and
          you will see the failures.
        </p>

        <p className="mt-3 text-base text-ash-dim">
          On third-party pages the privacy console can only simulate this, because a parent page
          cannot observe requests made inside a cross-origin frame. Here, it is the real thing.
        </p>

        <h2 className="mt-8 font-display text-xl text-ink">Requests attempted</h2>
        <ul className="mt-3 space-y-1.5">
          {DEMO_TRACKERS.map((tracker) => (
            <li
              key={tracker.domain}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-ash-light bg-white px-3 py-2"
            >
              <span className="technical text-sm text-ink">{tracker.domain}</span>
              <span className="font-mono text-xs text-ash-dim">
                {tracker.category} · {tracker.operator}
              </span>
            </li>
          ))}
        </ul>

        {/*
          Real script tags to real tracker origins. The CSP blocks them at the
          browser level; nothing here is faked or stubbed out.
        */}
        {DEMO_TRACKERS.map((tracker) => (
          <script key={tracker.domain} async src={`https://${tracker.domain}/minitor-demo.js`} />
        ))}

        <p className="mt-8 border-t border-ash-light pt-4 text-sm text-ash-dim">
          The scripts requested above do not exist as files. What matters is that the browser never
          gets far enough to find out — the policy stops the connection first.
        </p>
      </div>
    </main>
  );
}

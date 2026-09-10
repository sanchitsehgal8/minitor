# MiniTor — web demo

Browse privately. Understand what happens behind the page.

A privacy-focused browser experience, as a Next.js web app: a landing page, real
accounts, and a working in-browser browser shell with tabs, history, bookmarks,
private mode, HTTPS enforcement, a live privacy console — and **Website Privacy
Intelligence**, which analyses a site and reports the domains it contacts, what
MiniTor's rules would block, and an explainable privacy score.

## What is real and what is not

A hosted web page cannot inspect the network traffic of a site it embeds.
Browsers prevent that deliberately, so no amount of JavaScript works around it.
Rather than fake the parts that need that access, MiniTor labels them — on the
landing page and inside the app itself.

| Objective | Status | Notes |
|---|---|---|
| Tabbed navigation, back/forward/reload | **Real** | Own per-tab navigation stack; pages load in an iframe, so browsing is limited to a curated list of sites that allow framing |
| History and bookmarks per account | **Real** | Prisma-backed, survives refresh, logout and login elsewhere |
| Private mode | **Real** | Writes nothing; refused server-side, not just hidden client-side |
| Cookie visibility | **Partial** | First-party, JS-readable cookies only. Third-party cookies inside a cross-origin iframe are invisible to the parent by design |
| Tracker / ad-domain blocking | **Simulated** on third-party pages, **real** on `/demo/tracker-heavy` | The demo page is served by MiniTor, so a `Content-Security-Policy` genuinely blocks every blocklisted origin — verified: 6/6 requests fail with `errorText: csp` |
| HTTPS-only enforcement | **Real** | Pure URL-scheme inspection, works on any URL typed in |
| Website privacy analysis | **Modelled** | Scan reports come from one of five site profiles, not live measurement — a page cannot inspect another origin's traffic. Every report says so in its header. The scoring, tracker matching and party classification that produce it are real code, shared with the browser shell |

## Running locally

```bash
npm install          # also runs prisma generate
cp .env.example .env # then set NEXTAUTH_SECRET
npx prisma db push   # creates prisma/dev.db
npm run dev          # http://localhost:3000
```

Generate a real secret with `openssl rand -base64 32`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm test` | Unit tests for the policy and scan layers (109 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:studio` | Browse the database |

## Deploying to Vercel

SQLite does not work on Vercel's filesystem, so switch to Postgres:

1. In [prisma/schema.prisma](prisma/schema.prisma), change the datasource
   `provider` from `"sqlite"` to `"postgresql"`. Prisma requires this to be a
   literal, so it cannot be driven by an env var.
2. Set these environment variables in the Vercel project:
   - `DATABASE_URL` — the Postgres/Supabase connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — the deployment URL, e.g. `https://minitor.vercel.app`
3. Run `npx prisma db push` against that database once.
4. Deploy. `npm run build` generates the client as part of the build.

Search is already provider-portable: [`src/lib/db/search.ts`](src/lib/db/search.ts)
adds Prisma's `mode: 'insensitive'` only when `DATABASE_URL` points at Postgres,
because SQLite rejects that option and is case-insensitive for ASCII anyway.

## Architecture

Three layers, with the rules isolated in the middle one:

- **Interface** — `src/components/`. Presentational React; holds no privacy
  rules of its own.
- **Policy** — `src/lib/privacy/`, `src/lib/browser/`, `src/lib/scan/`. Pure
  TypeScript, no DOM and no network, which is why the same checks run in the
  browser and again on the server for any write. This is the layer the test
  suite covers.
- **Storage** — `src/lib/db/`, `prisma/`. A private tab never reaches it.

### Where the guarantees live

- **HTTPS enforcement** — [`src/lib/privacy/url.ts`](src/lib/privacy/url.ts).
  Bare hostnames become `https`; an explicit `http` URL is preserved (not
  silently upgraded) so the interstitial can report what was actually asked for.
- **Private mode** — enforced twice, independently: the client does not call the
  API ([`use-browser.ts`](src/hooks/use-browser.ts)), and the API refuses the
  write if it is called anyway
  ([`api/history/route.ts`](src/app/api/history/route.ts)). A regression in one
  is not a leak.
- **Honest labelling** — every privacy-console event carries an `enforcement`
  field of `'blocked'` or `'simulated'`
  ([`privacy-console.ts`](src/lib/privacy/privacy-console.ts)). An event cannot
  exist without one, so the UI cannot claim an enforcement that did not happen.
- **Navigation** — the shell keeps its own per-tab stack
  ([`navigation-stack.ts`](src/lib/browser/navigation-stack.ts)) because a
  parent page cannot observe navigation inside a cross-origin iframe.

## Website Privacy Intelligence

Open the Privacy Shield in the toolbar, or the **Analyse** panel, then either
"Analyse this site" or type any URL. The report covers the privacy score and its
four weighted factors, security observations with severities, a network request
table with filters and search, a connections graph, tracker and cookie
breakdowns, per-site controls, and comparison against another scan.

Where the logic lives — all of it outside the components:

| Module | Responsibility |
|---|---|
| [`types.ts`](src/lib/scan/types.ts) | `ScanResult`, `RequestRecord`, `TrackerFinding`, `CookieFinding`, `SecurityFinding`, `PrivacyScore` |
| [`site-profiles.ts`](src/lib/scan/site-profiles.ts) | Five archetypes and the domain→profile mapping. The seam a real backend would replace |
| [`scan-engine.ts`](src/lib/scan/scan-engine.ts) | Builds a report; classification reuses `TRACKER_BLOCKLIST` and `baseDomain` so "tracker" means one thing app-wide |
| [`privacy-score.ts`](src/lib/scan/privacy-score.ts) | Five weighted categories, each carrying its own explanation |
| [`tracking-parameters.ts`](src/lib/scan/tracking-parameters.ts) | `utm_*`/`gclid` detection and stripping — identifiers that ride inside the URL rather than in a request |
| [`security-score.ts`](src/lib/scan/security-score.ts) | Severity-weighted deductions, plus the disclaimer the UI must show |
| [`comparison.ts`](src/lib/scan/comparison.ts) | Side-by-side rows, score deltas, newly seen trackers |

Two properties the tests pin down:

- **Deterministic.** The same URL always produces the same report (seeded PRNG,
  never `Math.random()`), which is what makes score history meaningful rather
  than noise.
- **Never flattering by accident.** An unknown domain is never mapped to the
  privacy-friendly profile, and a site-level override re-derives the whole
  report through the engine, so allowing trackers visibly lowers the score
  instead of leaving a stale number.

Scans are stored per account in `ScanRecord`. Private tabs get the report but no
stored row — refused by the API, the same way history and bookmarks are.

## Credits

Krishiv Grag · Sanchit Kumar Sharma · Sanchit Shegal
Thapar Institute of Engineering and Technology

A student project. Not a substitute for Tor Browser.

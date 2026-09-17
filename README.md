# MiniTor

Browse privately. Understand what happens behind the page.

A privacy-focused browser experience built as a Next.js web app: a landing page,
real accounts, and a working in-browser browser shell with tabs, history,
bookmarks, private mode, HTTPS enforcement, a live privacy console — and
**Website Privacy Intelligence**, which analyses a site and reports the domains
it contacts, what MiniTor's rules would block, and an explainable privacy score.

---

## Quick start

```bash
npm install                # also generates the Prisma client
cp .env.example .env       # then set NEXTAUTH_SECRET (see below)
npm run db:setup           # creates the SQLite database and seeds a demo account
npm run dev                # http://localhost:3000
```

Generate a real signing secret and paste it into `.env`:

```bash
openssl rand -base64 32
```

Then sign in with the seeded account:

| Email | Password |
|---|---|
| `demo@minitor.test` | `minitor-demo-2026` |

It comes with browsing history, bookmarks and eight saved scans, so every
screen has something to show on first run. You can also create your own account
from `/signup`.

> The database file (`database/dev.db`) is **not** committed — it would hold real
> account rows and password hashes. `npm run db:setup` recreates it
> deterministically instead.

---

## What is real and what is not

A hosted web page cannot inspect the network traffic of a site it embeds.
Browsers prevent that deliberately, and no amount of JavaScript works around it.
Rather than fake the parts that need that access, MiniTor labels them — on the
landing page, in the API types, and inside the app itself.

| Capability | Status | Notes |
|---|---|---|
| Tabbed navigation, back/forward/reload | **Real** | Own per-tab navigation stack; pages load in an iframe, so browsing is limited to a curated list of sites that permit framing |
| Address-bar search | **Real** | Defaults to Marginalia, one of the few engines that permits framing. Verified by loading each candidate in a real iframe — see below |
| History and bookmarks per account | **Real** | Prisma-backed, survives refresh, logout, and login elsewhere |
| Private mode | **Real** | Writes nothing; refused server-side, not merely hidden client-side |
| HTTPS-only enforcement | **Real** | Pure URL-scheme inspection, works on any URL typed in |
| Cookie visibility | **Partial** | First-party, JS-readable cookies only. Third-party cookies inside a cross-origin iframe are invisible to the parent by design |
| Tracker / ad-domain blocking | **Simulated** on third-party pages, **real** on `/demo/tracker-heavy` | The demo page is served by MiniTor, so a `Content-Security-Policy` genuinely blocks every blocklisted origin — verified in a headless browser: 6/6 requests fail with `errorText: csp` |
| Website privacy analysis | **Modelled** | Scan reports come from one of five site profiles, not live measurement. Every report says so in its header. The scoring, tracker matching and party classification that produce it are real code, shared with the browser shell |

This distinction is carried in the type system, not just in copy:

- `ScanResult.dataSource` is a **required** field (`'simulated-profile'` or
  `'measured-first-party'`), so no report can render without declaring its
  provenance. It is re-validated when a stored scan is read back from the
  database, so an older or corrupt row cannot slip through undeclared.
- `PrivacyEvent.enforcement` is a **required** `'blocked' | 'simulated'`, so a
  console event cannot claim an enforcement that did not happen.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (generates the Prisma client first) |
| `npm start` | Serve the production build |
| `npm test` | Unit tests for the policy, scan and validation layers (168 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:setup` | Create the database and seed the demo account |
| `npm run db:seed` | Re-seed only (idempotent — replaces the demo account's rows) |
| `npm run db:push` | Apply the schema without seeding |
| `npm run db:studio` | Browse the database |

Every Prisma command passes `--schema=database/schema.prisma`, because the
schema does not live in Prisma's default `prisma/` directory.

---

## Environment variables

Copy `.env.example` to `.env`. `.env` is git-ignored; the example is the
committed template.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Connection string. For SQLite the path is resolved **relative to the schema file**, so `file:./dev.db` creates `database/dev.db` |
| `NEXTAUTH_SECRET` | yes | Signs the JWT session cookie. Generate with `openssl rand -base64 32`. Auth fails in production without it |
| `NEXTAUTH_URL` | yes | Canonical origin NextAuth builds callback URLs from. Must match the port actually served (`http://localhost:3000` in development) |

No secrets are committed, and none are read on the client.

---

## Architecture

Three layers, with the rules isolated in the middle one:

- **Interface** — `src/components/`. Presentational React; holds no privacy
  rules of its own.
- **Policy** — `src/lib/privacy/`, `src/lib/browser/`, `src/lib/scan/`. Pure
  TypeScript, no DOM and no network, which is why the same checks run in the
  browser and again on the server for any write. This is the layer the test
  suite covers.
- **Storage** — `src/lib/db/`, `database/`. A private tab never reaches it.

```
src/
  app/                 routes, API handlers, middleware
  components/          UI, grouped by surface (shell, privacy, auth, landing, ui)
  hooks/               client state: browser, scans, history, bookmarks
  lib/
    auth/              session, password hashing
    browser/           tab reducer, navigation stack
    privacy/           URL rules, search engines, tracker blocklist, console events
    scan/              scan engine, scoring, profiles, comparison
    validation/        Zod schemas shared by client and server
database/              Prisma schema + seed script
tests/                 unit tests (168)
```

### Where the guarantees live

- **HTTPS enforcement** — [`src/lib/privacy/url.ts`](src/lib/privacy/url.ts).
  Bare hostnames become `https`; an explicit `http` URL is preserved (not
  silently upgraded) so the interstitial can report what was actually asked for.
  Consent to load it anyway is passed as an explicit argument, never as a magic
  fragment appended to the URL — a sentinel could be forged by typing it.
- **Private mode** — enforced twice, independently: the client does not call the
  API ([`use-browser.ts`](src/hooks/use-browser.ts)), and the API refuses the
  write if it is called anyway
  ([`api/history/route.ts`](src/app/api/history/route.ts)). A regression in one
  is not a leak.
- **User isolation** — every query and mutation is scoped by `userId`, so another
  account's record id matches nothing and returns 404 rather than being readable
  or deletable.
- **Honest labelling** — see `dataSource` and `enforcement` above.
- **Navigation** — the shell keeps its own per-tab stack
  ([`navigation-stack.ts`](src/lib/browser/navigation-stack.ts)) because a
  parent page cannot observe navigation inside a cross-origin iframe.
- **First-vs-third party** — [`baseDomain`](src/lib/privacy/url.ts) understands
  multi-label public suffixes (`bbc.co.uk` is not `co.uk`) and returns IP
  literals whole. A naive last-two-labels rule would classify unrelated
  `.co.uk` sites as the same party, which is a privacy misclassification rather
  than a cosmetic one.

---

## Website Privacy Intelligence

Open the Privacy Shield in the toolbar, or the **Analyse** panel, then either
"Analyse this site" or type any URL. The report covers the privacy score and its
five weighted factors, security observations with severities, a network request
table with filters and search, a connections graph, tracker, cookie and
parameter breakdowns, per-site controls, and comparison against another scan.

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
  than noise. Verified end-to-end: three scans of one site return identical
  scores, tracker counts and request counts.
- **Never flattering by accident.** An unknown domain is never mapped to the
  privacy-friendly profile, and a site-level override re-derives the whole
  report through the engine — allowing trackers visibly drops the score (46 → 30
  for `nytimes.com`) instead of leaving a stale number.

Scans are stored per account in `ScanRecord`. Private tabs get the report but no
stored row — refused by the API, the same way history and bookmarks are.

---

## Testing

```bash
npm test
```

168 unit tests across the policy, scan, scoring and validation layers. They
cover the properties that carry product meaning rather than restating the
implementation:

- **Scan determinism** — identical reports for identical input, and identical
  scores regardless of how the host was written.
- **Privacy scoring** — exactly five factors whose weights sum to 1, clamped to
  0–100, never `NaN` at zero requests, and ordered so a tracker-heavy site
  scores below a privacy-first one.
- **Party classification** — multi-label public suffixes and IP literals.
- **Blocklist matching** — every rule round-trips through its own label, and a
  path-scoped rule (`facebook.com/tr`) matches the pixel without blocking the
  whole domain.
- **Private mode** — the `isPrivate` contract, and that its default is the safe
  value.
- **Browser navigation** — the tab reducer's invariants, including that a stale
  close cannot destroy a live tab.
- **URL handling** — scheme rejection for `javascript:`, `data:`, `file:` and
  `ftp:`, at both the address bar and the scan entry point.

Beyond the unit suite, the following were verified by driving the running app in
a headless browser: the auth flow, all six report tabs, site controls
re-deriving the score, per-tab privacy console isolation, cross-user isolation
(five attack shapes, all 404), zero horizontal overflow at 375px, and the CSP
demo genuinely blocking 6/6 tracker requests.

---

## Deploying

SQLite does not work on Vercel's filesystem, so switch to Postgres:

1. In [`database/schema.prisma`](database/schema.prisma), change the datasource
   `provider` from `"sqlite"` to `"postgresql"`. Prisma requires this to be a
   literal, so it cannot be driven by an env var.
2. Set these environment variables in the project:
   - `DATABASE_URL` — the Postgres/Supabase connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — the deployment URL, e.g. `https://minitor.vercel.app`
3. Run `npm run db:push` against that database once.
4. Deploy. `npm run build` generates the client as part of the build.

Search is already provider-portable: [`src/lib/db/search.ts`](src/lib/db/search.ts)
adds Prisma's `mode: 'insensitive'` only when `DATABASE_URL` points at Postgres,
because SQLite rejects that option and is case-insensitive for ASCII anyway.

---

## Security notes

- Passwords are bcrypt-hashed at cost 12 and never returned by any endpoint.
- Login equalises timing between "no such account" and "wrong password", so
  account existence is not inferable from response time.
- Sessions are JWT cookies (`httpOnly`), so page scripts cannot read them —
  visible in the Cookies panel, which correctly reports zero readable cookies.
- Every record query is scoped by `userId`; cross-account access returns 404
  rather than 403, so ids are not confirmed to exist.
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) are set on every route, plus a strict
  `Content-Security-Policy` on `/demo/*`.
- Only `http(s)` URLs are accepted anywhere a URL is stored or scanned.

---

## Known limitations

These are deliberate, and stated rather than hidden:

- **Scan reports are modelled, not measured.** A page cannot observe another
  origin's network traffic. The engine is a seam a real backend scanner would
  replace without touching a component.
- **Browsing is limited to sites that allow framing.** Most large sites send
  `X-Frame-Options`, and the shell explains this rather than showing a blank
  frame.
- **Search cannot use a mainstream engine.** DuckDuckGo, Startpage, Brave and
  Mojeek all refuse framing, so results would never render. The default is
  Marginalia, with Wiby and Wikipedia offered alongside it — each verified by
  loading it in a real iframe rather than by trusting its headers, since the
  `lite.` and `html.` DuckDuckGo endpoints advertise no framing headers and
  still refuse. Searching a DuckDuckGo URL directly still works, but opens in a
  real browser tab; the refusal screen offers the same query on an engine that
  does render.
- **Monitoring marks a site for tracking; it does not run background jobs.**
  There is no scheduler — the flag is honest about being a list, and re-scans
  happen when you open the site.
- **The public-suffix list is a small curated set**, not a vendored copy of the
  full PSL. It covers the suffixes the profiles and blocklist actually use; a
  production deployment would depend on `psl`.
- **Cookie visibility is first-party and JS-readable only**, by browser design.

---

## Credits

Krishiv Grag · Sanchit Kumar Sharma · Sanchit Shegal
Thapar Institute of Engineering and Technology

A student project. Not a substitute for Tor Browser.

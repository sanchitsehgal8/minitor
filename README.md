# MiniTor — web demo

A privacy-focused browser experience, as a Next.js web app: a landing page, real
accounts, and a working in-browser browser shell with tabs, history, bookmarks,
private mode, HTTPS enforcement and a live privacy console.

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
| `npm test` | Unit tests for the policy layer (44 tests) |
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
- **Policy** — `src/lib/privacy/`, `src/lib/browser/`. Pure TypeScript, no DOM
  and no network, which is why the same checks run in the browser and again on
  the server for any write. This is the layer the test suite covers.
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

## Credits

Krishiv Grag · Sanchit Kumar Sharma · Sanchit Shegal
Thapar Institute of Engineering and Technology

A student project. Not a substitute for Tor Browser.

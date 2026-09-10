# MiniTor — notes for future work

Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + NextAuth.

## Commands

```bash
npm run dev        # dev server
npm test           # policy-layer unit tests
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # prisma generate + next build
```

## Non-obvious constraints

- **Tailwind's `colors` and `spacing` are replaced, not extended.** A default
  utility like `bg-slate-500` or `p-7` does not exist and fails the build. Add a
  token to [tailwind.config.ts](tailwind.config.ts) rather than reaching for the
  default palette.
- **Prisma's datasource `provider` must be a literal**, so it cannot be switched
  by an env var. Deploying to Postgres means editing
  [prisma/schema.prisma](prisma/schema.prisma) — see the README.
- **`middleware.ts` cannot import `authOptions`.** It runs in the edge runtime
  and `authOptions` pulls in Prisma and bcrypt, so `pages.signIn` is repeated
  there. Both the middleware and `/app` check the session; that duplication is
  intentional.
- **Privacy rules belong in `src/lib/`, not in components.** They are pure so
  the same code can run client-side and again server-side on write, and so the
  test suite can cover them without React.

## The honesty invariant

Every privacy-console event carries `enforcement: 'blocked' | 'simulated'`, and
only first-party pages can produce `'blocked'`. Do not add a code path that
emits `'blocked'` for a cross-origin page — the parent frame genuinely cannot
observe or cancel those requests, and the label would be a lie. If a new feature
needs real blocking, it needs a browser extension or native app, not a
workaround here.

Private mode is enforced in two independent places (client does not call; server
refuses). Keep both.

## Verified behaviour

Checked against a running build, not assumed:

- `/demo/tracker-heavy` — 6/6 tracker requests fail with `errorText: csp`
- private tab visit → history API returns `202 recorded:false`, no DB row
- typed `http://` URL → interstitial, address bar retains the URL, amber padlock
- non-curated host → X-Frame-Options explainer
- cross-origin frame unreadable from parent; `allow-top-navigation` absent
- no horizontal scroll at 390px on the landing page or the shell
- reduced-motion → hero renders its final state immediately

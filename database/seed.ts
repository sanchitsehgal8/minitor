/**
 * Seeds a fresh database with one demo account and enough realistic activity
 * that every screen has something to show on first run.
 *
 * Why this exists: `database/dev.db` is deliberately NOT committed. It held
 * real account rows and bcrypt hashes, which do not belong in version control,
 * and a binary SQLite file is not a reviewable artefact anyway. This script is
 * the reproducible replacement — an evaluator runs `npm run db:setup` and gets
 * the same data every time.
 *
 * Idempotent: re-running replaces the demo user's rows rather than duplicating
 * them, so it is safe to run repeatedly during development.
 *
 * Run with `npm run db:seed` (vite-node resolves the `@/` alias from
 * vitest.config.ts, so no extra runtime dependency is needed).
 */

import { PrismaClient } from '@prisma/client';

import { hashPassword } from '@/lib/auth/passwords';
import { buildScanResult } from '@/lib/scan/scan-engine';

const prisma = new PrismaClient();

/**
 * Published in the README so an evaluator can sign in immediately. A weak
 * password is acceptable precisely because this account is disposable, public,
 * and local-only — but it still goes through the real bcrypt path rather than
 * being special-cased anywhere in the auth code.
 */
const DEMO_EMAIL = 'demo@minitor.test';
const DEMO_PASSWORD = 'minitor-demo-2026';

/** Fixed clock so seeded timestamps — and therefore score history — are stable. */
const NOW = new Date('2026-09-15T10:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600_000);
const daysAgo = (days: number) => hoursAgo(days * 24);

const HISTORY: readonly { url: string; title: string; hours: number }[] = [
  { url: 'https://en.wikipedia.org/wiki/Tor_(network)', title: 'Tor (network) — Wikipedia', hours: 2 },
  { url: 'https://www.mozilla.org/en-US/privacy/', title: 'Privacy — Mozilla', hours: 5 },
  { url: 'https://archive.org/', title: 'Internet Archive', hours: 9 },
  { url: 'https://www.theguardian.com/international', title: 'The Guardian', hours: 26 },
  { url: 'https://www.bbc.co.uk/news', title: 'BBC News', hours: 31 },
  { url: 'https://openlibrary.org/', title: 'Open Library', hours: 50 },
  { url: 'https://www.rfc-editor.org/rfc/rfc9110.html', title: 'RFC 9110 — HTTP Semantics', hours: 73 },
  { url: 'https://example.com/', title: 'Example Domain', hours: 96 },
];

const BOOKMARKS: readonly { url: string; title: string; days: number }[] = [
  { url: 'https://en.wikipedia.org/', title: 'Wikipedia', days: 1 },
  { url: 'https://www.mozilla.org/en-US/privacy/', title: 'Mozilla Privacy', days: 3 },
  { url: 'https://archive.org/', title: 'Internet Archive', days: 6 },
  { url: '/demo/tracker-heavy', title: 'MiniTor — tracker-heavy demo', days: 8 },
];

/**
 * Scans across the profile spectrum, so the dashboard, comparison view and
 * score history all have contrasting data rather than five identical reports.
 *
 * Wikipedia is scanned three times at different dates: score history needs more
 * than one point per domain to draw a line, and re-scanning an unchanged site
 * is exactly what should produce a flat one (the engine is deterministic).
 */
const SCANS: readonly { url: string; hours: number; monitored: boolean }[] = [
  { url: 'https://en.wikipedia.org/', hours: 24 * 12, monitored: true },
  { url: 'https://en.wikipedia.org/', hours: 24 * 5, monitored: true },
  { url: 'https://en.wikipedia.org/', hours: 3, monitored: true },
  { url: 'https://www.theguardian.com/', hours: 24 * 4, monitored: false },
  { url: 'https://www.nytimes.com/', hours: 24 * 2, monitored: true },
  { url: 'https://www.amazon.com/', hours: 30, monitored: false },
  { url: 'https://www.facebook.com/', hours: 12, monitored: false },
  { url: 'https://www.mozilla.org/', hours: 6, monitored: false },
];

async function main(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, passwordHash },
    update: { passwordHash },
    select: { id: true },
  });

  // Clear only this account's rows, so a developer's own test account created
  // alongside the demo one survives a re-seed.
  await prisma.$transaction([
    prisma.historyEntry.deleteMany({ where: { userId: user.id } }),
    prisma.bookmark.deleteMany({ where: { userId: user.id } }),
    prisma.scanRecord.deleteMany({ where: { userId: user.id } }),
  ]);

  await prisma.historyEntry.createMany({
    data: HISTORY.map((entry) => ({
      userId: user.id,
      url: entry.url,
      title: entry.title,
      visitedAt: hoursAgo(entry.hours),
    })),
  });

  await prisma.bookmark.createMany({
    data: BOOKMARKS.map((bookmark) => ({
      userId: user.id,
      url: bookmark.url,
      title: bookmark.title,
      createdAt: daysAgo(bookmark.days),
    })),
  });

  for (const entry of SCANS) {
    const scannedAt = hoursAgo(entry.hours);
    // Built through the real engine, not hand-written JSON: seeded reports stay
    // in sync with the scoring code automatically instead of going stale.
    const result = buildScanResult({ url: entry.url, scannedAt: scannedAt.toISOString() });

    await prisma.scanRecord.create({
      data: {
        userId: user.id,
        domain: result.domain,
        url: result.url,
        privacyScore: result.privacy.total,
        securityScore: result.security.total,
        monitored: entry.monitored,
        payload: JSON.stringify(result),
        scannedAt,
      },
    });
  }

  const counts = {
    history: await prisma.historyEntry.count({ where: { userId: user.id } }),
    bookmarks: await prisma.bookmark.count({ where: { userId: user.id } }),
    scans: await prisma.scanRecord.count({ where: { userId: user.id } }),
  };

  console.log(
    [
      '',
      '  MiniTor database seeded.',
      '',
      `    email     ${DEMO_EMAIL}`,
      `    password  ${DEMO_PASSWORD}`,
      '',
      `    ${counts.history} history entries · ${counts.bookmarks} bookmarks · ${counts.scans} scans`,
      '',
    ].join('\n'),
  );
}

main()
  .catch((error: unknown) => {
    console.error('\n  Seeding failed:', error instanceof Error ? error.message : error, '\n');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

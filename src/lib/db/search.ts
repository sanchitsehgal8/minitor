/**
 * Case-insensitive `contains` that behaves the same on SQLite and Postgres.
 *
 * SQLite's `LIKE` is already case-insensitive for ASCII, so Prisma's
 * `mode: 'insensitive'` is unsupported there and throws. Postgres' `LIKE` is
 * case-sensitive and needs that mode. Centralising the difference here means
 * switching provider for deployment does not silently change search behaviour.
 */

type ContainsFilter = { contains: string; mode?: 'insensitive' };

const NEEDS_INSENSITIVE_MODE = process.env.DATABASE_URL?.startsWith('postgres') ?? false;

export function containsInsensitive(value: string): ContainsFilter {
  return NEEDS_INSENSITIVE_MODE ? { contains: value, mode: 'insensitive' } : { contains: value };
}

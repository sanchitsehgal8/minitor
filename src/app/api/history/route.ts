import type { NextRequest } from 'next/server';

import { failure, guard, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { containsInsensitive } from '@/lib/db/search';
import { prisma } from '@/lib/db/prisma';
import { historyWriteSchema } from '@/lib/validation/schemas';

const PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

    const entries = await prisma.historyEntry.findMany({
      where: {
        userId: user.id,
        ...(query
          ? {
              OR: [
                { url: containsInsensitive(query) },
                { title: containsInsensitive(query) },
              ],
            }
          : {}),
      },
      orderBy: { visitedAt: 'desc' },
      take: PAGE_SIZE,
      select: { id: true, url: true, title: true, visitedAt: true },
    });

    return ok({ entries });
  });
}

export async function POST(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = historyWriteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'That request was not valid.', 422);
    }

    /**
     * Private-mode enforcement (spec §5): the route refuses to persist, so a
     * bug or a hand-crafted request in the client cannot leak a private visit
     * into history. Answered 202 — accepted and deliberately discarded — so the
     * client does not treat the refusal as a failure to retry.
     */
    if (parsed.data.isPrivate) {
      return ok({ recorded: false, reason: 'Private tabs do not record history.' }, 202);
    }

    const entry = await prisma.historyEntry.create({
      data: { userId: user.id, url: parsed.data.url, title: parsed.data.title },
      select: { id: true, url: true, title: true, visitedAt: true },
    });

    return ok({ recorded: true, entry }, 201);
  });
}

export async function DELETE() {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { count } = await prisma.historyEntry.deleteMany({ where: { userId: user.id } });
    return ok({ deleted: count });
  });
}

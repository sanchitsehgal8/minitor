import type { NextRequest } from 'next/server';

import { failure, guard, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { containsInsensitive } from '@/lib/db/search';
import { prisma } from '@/lib/db/prisma';
import { bookmarkWriteSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

    const bookmarks = await prisma.bookmark.findMany({
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
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, title: true, createdAt: true },
    });

    return ok({ bookmarks });
  });
}

export async function POST(request: NextRequest) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = bookmarkWriteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'That request was not valid.', 422);
    }

    /**
     * Private mode blocks bookmark writes too (spec §6: "zero writes to
     * history/bookmarks"), enforced server-side for the same reason as history.
     */
    if (parsed.data.isPrivate) {
      return ok({ saved: false, reason: 'Private tabs do not save bookmarks.' }, 202);
    }

    // Idempotent on (userId, url): re-saving refreshes the title rather than
    // creating a duplicate row.
    const bookmark = await prisma.bookmark.upsert({
      where: { userId_url: { userId: user.id, url: parsed.data.url } },
      create: { userId: user.id, url: parsed.data.url, title: parsed.data.title },
      update: { title: parsed.data.title },
      select: { id: true, url: true, title: true, createdAt: true },
    });

    return ok({ saved: true, bookmark }, 201);
  });
}

import type { NextRequest } from 'next/server';

import { failure, guard, notFound, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { bookmarkWriteSchema } from '@/lib/validation/schemas';

type Params = { readonly params: { readonly id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = bookmarkWriteSchema.partial().safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'That request was not valid.', 422);
    }

    const { count } = await prisma.bookmark.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.url ? { url: parsed.data.url } : {}),
      },
    });
    if (count === 0) return notFound();

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: params.id },
      select: { id: true, url: true, title: true, createdAt: true },
    });

    return ok({ bookmark });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { count } = await prisma.bookmark.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return count === 0 ? notFound() : ok({ deleted: params.id });
  });
}

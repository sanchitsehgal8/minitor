import type { NextRequest } from 'next/server';

import { failure, guard, notFound, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { monitorToggleSchema } from '@/lib/validation/schemas';

type Params = { readonly params: { readonly id: string } };

/** Toggles monitoring for a stored scan (spec §15). */
export async function PATCH(request: NextRequest, { params }: Params) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const parsed = monitorToggleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'That request was not valid.', 422);
    }

    // Scoped by userId so another account's id matches nothing.
    const { count } = await prisma.scanRecord.updateMany({
      where: { id: params.id, userId: user.id },
      data: { monitored: parsed.data.monitored },
    });

    return count === 0 ? notFound() : ok({ id: params.id, monitored: parsed.data.monitored });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { count } = await prisma.scanRecord.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return count === 0 ? notFound() : ok({ deleted: params.id });
  });
}

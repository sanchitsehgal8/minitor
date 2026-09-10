import { guard, notFound, ok, unauthorized } from '@/lib/api/respond';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

type Params = { readonly params: { readonly id: string } };

export async function DELETE(_request: Request, { params }: Params) {
  return guard(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Scope the delete by userId so an id belonging to another account simply
    // matches nothing, rather than being deletable.
    const { count } = await prisma.historyEntry.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return count === 0 ? notFound() : ok({ deleted: params.id });
  });
}

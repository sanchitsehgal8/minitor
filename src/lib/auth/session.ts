import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/options';

export type SessionUser = { readonly id: string; readonly email: string };

/** The signed-in user, or null. Single accessor for every server caller. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null } | undefined;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email };
}

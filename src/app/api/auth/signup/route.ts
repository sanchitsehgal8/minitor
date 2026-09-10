import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { failure, guard, ok } from '@/lib/api/respond';
import { hashPassword } from '@/lib/auth/passwords';
import { prisma } from '@/lib/db/prisma';
import { signupSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  return guard(async () => {
    const parsed = signupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'Check the form and try again.', 422);
    }

    const { email, password } = parsed.data;

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash: await hashPassword(password) },
        select: { id: true, email: true },
      });
      return ok({ user }, 201);
    } catch (error) {
      // Rely on the unique constraint rather than a check-then-insert, which
      // would race two concurrent signups for the same address.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return failure('An account with that email already exists.', 409);
      }
      throw error;
    }
  });
}

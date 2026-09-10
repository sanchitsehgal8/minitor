import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { prisma } from '@/lib/db/prisma';
import { burnTime, verifyPassword } from '@/lib/auth/passwords';
import { credentialsSchema } from '@/lib/validation/schemas';

/**
 * Credentials-only auth with JWT sessions (spec §2). JWT rather than a database
 * session table because the shell is a long-lived single page — it should not
 * hit the DB on every navigation just to confirm the caller.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          await burnTime();
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, passwordHash: true },
        });

        if (!user) {
          // Equalise timing so a missing account is not distinguishable from a
          // wrong password.
          await burnTime();
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

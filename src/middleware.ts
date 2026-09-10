import { withAuth } from 'next-auth/middleware';

/**
 * Redirects unauthenticated requests for /app to /login before the page runs
 * (spec §8). `pages` has to be repeated here: middleware runs in the edge
 * runtime and cannot import `authOptions`, which pulls in Prisma and bcrypt.
 *
 * The page itself re-checks the session too — defence in depth, so a change to
 * the matcher below cannot silently expose the shell.
 */
export default withAuth({ pages: { signIn: '/login' } });

export const config = { matcher: ['/app'] };

import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient per process. Next dev's module reloading would otherwise
 * open a new connection pool on every edit until the database refuses more.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

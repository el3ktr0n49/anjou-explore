/**
 * Prisma Client Singleton
 *
 * Évite de créer plusieurs instances Prisma en développement (hot reload)
 * Pattern recommandé par Prisma pour Next.js/Astro
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper pour fermer la connexion proprement
export async function disconnect() {
  await prisma.$disconnect();
}

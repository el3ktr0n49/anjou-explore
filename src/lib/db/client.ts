/**
 * Prisma Client Singleton
 *
 * Évite de créer plusieurs instances Prisma en développement (hot reload)
 * Pattern recommandé par Prisma pour Next.js/Astro
 */

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Créer le pool de connexions PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Créer l'adapter PostgreSQL avec le pool
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper pour fermer la connexion proprement
export async function disconnect() {
  await prisma.$disconnect();
}

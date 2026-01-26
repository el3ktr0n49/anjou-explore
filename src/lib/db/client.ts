/**
 * Prisma Client Singleton
 *
 * Évite de créer plusieurs instances Prisma en développement (hot reload)
 * Pattern recommandé par Prisma pour Next.js/Astro
 */

// Charger les variables d'environnement depuis .env
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Créer l'adapter PostgreSQL avec la connection string
const connectionString = process.env.DATABASE_URL as string;

if (!connectionString) {
  throw new Error('DATABASE_URL is required in environment variables');
}

const adapter = new PrismaPg({ connectionString });

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

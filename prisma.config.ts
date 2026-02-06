/**
 * Prisma Configuration File
 *
 * Ce fichier contourne le bug Prisma 7.2.0 où DATABASE_URL
 * n'est pas correctement résolu depuis les variables d'environnement
 * dans les conteneurs Docker.
 *
 * Référence: https://github.com/prisma/prisma/issues/28983
 */

import { defineConfig } from 'prisma/config';

// Récupérer DATABASE_URL depuis l'environnement
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please ensure it is defined in your environment or Kubernetes secret.'
  );
}

// Exporter la configuration Prisma
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'bun run prisma/seed.ts',
  },
});

#!/usr/bin/env bun
/**
 * Smart Database Initialization Script
 *
 * Ce script est exécuté au démarrage de l'application en production.
 * Il gère intelligemment l'initialisation de la base de données :
 *
 * - Premier déploiement : Exécute les migrations et seed les admins
 * - Déploiements suivants : Exécute seulement les migrations (si nécessaires)
 *
 * Utilisation :
 * - En production : Appelé automatiquement par le Dockerfile/Kubernetes
 * - En local : `bun run scripts/init-db.ts`
 */

import { prisma } from '../src/lib/db/client';

/**
 * Vérifie si la base de données est vide (premier déploiement)
 */
async function isDatabaseEmpty(): Promise<boolean> {
  try {
    // Vérifier si la table Admin existe et contient des données
    const adminCount = await prisma.admin.count();
    return adminCount === 0;
  } catch (error) {
    // Si erreur (table n'existe pas), la DB est vide
    return true;
  }
}

/**
 * Exécute les migrations Prisma
 */
async function runMigrations(): Promise<void> {
  console.log('🔄 Running Prisma migrations...');

  try {
    // Vérifier que DATABASE_URL est défini
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    // En production, utiliser `prisma migrate deploy` (jamais `db:push`)
    // Passer explicitement DATABASE_URL dans l'environnement pour contourner le bug Prisma 7.2.0
    const proc = Bun.spawn(['bunx', 'prisma', 'migrate', 'deploy'], {
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL, // Explicitement passé pour bug Prisma 7.2.0
      },
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Prisma migrate failed with exit code ${exitCode}`);
    }

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Seed les administrateurs (seulement en premier déploiement)
 */
async function seedAdmins(): Promise<void> {
  console.log('🌱 Seeding admin users...');

  try {
    // Importer le seed script de Prisma
    const { seedAdmins: seedAdminsFunction } = await import('../prisma/seed');
    await seedAdminsFunction();

    console.log('✅ Admin users seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase(): Promise<void> {
  console.log('🚀 Starting database initialization...');

  try {
    // Test connexion
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Vérifier si premier déploiement
    const isEmpty = await isDatabaseEmpty();

    if (isEmpty) {
      console.log('🆕 First deployment detected - Full initialization');

      // Exécuter migrations
      await runMigrations();

      // Seed admins uniquement (pas de données de test en production)
      if (process.env.NODE_ENV === 'production') {
        console.log('📊 Production mode: Seeding admins only');
        await seedAdmins();
      } else {
        console.log('🧪 Development mode: Full seed');
        const proc = Bun.spawn(['bunx', 'prisma', 'db', 'seed'], {
          stdout: 'inherit',
          stderr: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL, // Explicitement passé pour bug Prisma 7.2.0
          },
        });
        await proc.exited;
      }
    } else {
      console.log('♻️  Existing database detected - Running migrations only');
      await runMigrations();
    }

    console.log('✅ Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (import.meta.main) {
  initializeDatabase();
}

export { initializeDatabase, isDatabaseEmpty, runMigrations, seedAdmins };

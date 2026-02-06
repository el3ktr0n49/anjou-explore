// Force SSR : Endpoint runtime qui accède à la DB
export const prerender = false;

import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db/client';

/**
 * Health check endpoint for Kubernetes liveness/readiness probes
 *
 * Vérifie :
 * - L'application répond (HTTP 200)
 * - La connexion à la base de données fonctionne
 *
 * Utilisé par :
 * - Kubernetes livenessProbe (redémarre le pod si unhealthy)
 * - Kubernetes readinessProbe (retire du Service si not ready)
 * - Monitoring externe (UptimeRobot, etc.)
 */
export const GET: APIRoute = async () => {
  try {
    // Test connexion base de données
    await prisma.$queryRaw`SELECT 1`;

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: process.uptime(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('❌ Health check failed:', error);

    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
};

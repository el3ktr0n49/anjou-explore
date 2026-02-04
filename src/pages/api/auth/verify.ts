/**
 * GET /api/auth/verify
 *
 * Vérifie si l'utilisateur est authentifié
 * Utile pour les redirections côté client
 *
 * Response success (200):
 * {
 *   authenticated: true,
 *   admin: { id, name, mustChangePassword }
 * }
 *
 * Response not authenticated (401):
 * {
 *   authenticated: false
 * }
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware';
import { prisma } from '../../../lib/db/client';

export const GET: APIRoute = async (context) => {
  const admin = await requireAuth(context);

  if (!admin) {
    return new Response(
      JSON.stringify({
        authenticated: false,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Récupérer les données complètes de l'admin depuis la BDD
  const adminData = await prisma.admin.findUnique({
    where: { id: admin.adminId },
    select: {
      id: true,
      name: true,
      mustChangePassword: true,
    },
  });

  if (!adminData) {
    return new Response(
      JSON.stringify({
        authenticated: false,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      admin: {
        id: adminData.id,
        name: adminData.name,
        mustChangePassword: adminData.mustChangePassword,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

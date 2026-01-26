/**
 * GET /api/auth/verify
 *
 * Vérifie si l'utilisateur est authentifié
 * Utile pour les redirections côté client
 *
 * Response success (200):
 * {
 *   authenticated: true,
 *   admin: { id, name }
 * }
 *
 * Response not authenticated (401):
 * {
 *   authenticated: false
 * }
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware';

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

  return new Response(
    JSON.stringify({
      authenticated: true,
      admin: {
        id: admin.adminId,
        name: admin.adminName,
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

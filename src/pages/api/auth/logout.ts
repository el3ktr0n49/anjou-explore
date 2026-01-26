/**
 * POST /api/auth/logout
 *
 * Déconnecte l'admin en supprimant le cookie JWT
 *
 * Response (200):
 * {
 *   success: true
 * }
 */

import type { APIRoute } from 'astro';
import { createLogoutCookie, extractTokenFromCookie } from '../../../lib/auth/jwt';
import { prisma } from '../../../lib/db/client';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Optionnel : Supprimer la session de la BDD
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (token) {
      // Supprimer la session en BDD
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Retourner un cookie expiré pour déconnecter
    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie(),
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors du logout:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

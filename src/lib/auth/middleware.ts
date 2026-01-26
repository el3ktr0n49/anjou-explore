/**
 * Authentication Middleware
 *
 * Vérifie que l'utilisateur est authentifié via JWT
 * À utiliser dans les routes API /api/admin/*
 */

import type { APIContext } from 'astro';
import { extractTokenFromCookie, verifyToken, type JWTPayload } from './jwt';

export interface AuthenticatedContext extends APIContext {
  locals: {
    admin: JWTPayload;
  };
}

/**
 * Vérifie si la requête contient un token JWT valide
 *
 * @returns Le payload JWT si authentifié, null sinon
 *
 * @example
 * // Dans une API route:
 * export async function GET(context: APIContext) {
 *   const admin = await requireAuth(context);
 *   if (!admin) {
 *     return new Response(JSON.stringify({ error: 'Non authentifié' }), {
 *       status: 401
 *     });
 *   }
 *   // ... route protégée
 * }
 */
export async function requireAuth(
  context: APIContext
): Promise<JWTPayload | null> {
  const cookieHeader = context.request.headers.get('cookie');
  const token = extractTokenFromCookie(cookieHeader);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  // Optionnel : vérifier que l'admin existe toujours en BDD
  // (au cas où il aurait été désactivé)
  // const admin = await prisma.admin.findUnique({
  //   where: { id: payload.adminId, isActive: true }
  // });
  // if (!admin) return null;

  return payload;
}

/**
 * Helper pour retourner une erreur 401 Unauthorized
 */
export function unauthorizedResponse(message = 'Non authentifié'): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: 'UNAUTHORIZED',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Helper pour retourner une erreur 403 Forbidden
 */
export function forbiddenResponse(message = 'Accès refusé'): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: 'FORBIDDEN',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

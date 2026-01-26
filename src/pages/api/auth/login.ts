/**
 * POST /api/auth/login
 *
 * Authentification admin avec mot de passe partagé + 2FA individuel
 *
 * Body:
 * {
 *   password: string,      // Mot de passe partagé
 *   adminName: string,     // "José", "Fabien", "Benoît", "Adrien"
 *   token2FA: string       // Code 6 chiffres Google Authenticator
 * }
 *
 * Response success (200):
 * {
 *   success: true,
 *   admin: { id, name }
 * }
 * + Cookie httpOnly avec JWT
 *
 * Response error (401):
 * {
 *   error: string
 * }
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/db/client';
import { verify2FAToken } from '../../../lib/auth/2fa';
import { generateToken, createAuthCookie } from '../../../lib/auth/jwt';

const ADMIN_SHARED_PASSWORD = process.env.ADMIN_SHARED_PASSWORD || 'dev_password_change_in_prod';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Debug: vérifier les variables d'environnement
    console.log('DATABASE_URL defined?', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL value:', process.env.DATABASE_URL?.substring(0, 20) + '...');

    // 1. Parser le body
    const body = await request.json();
    const { password, adminName, token2FA } = body;

    // 2. Validation des inputs
    if (!password || !adminName || !token2FA) {
      return new Response(
        JSON.stringify({
          error: 'Données manquantes',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier le mot de passe partagé
    // Note: En dev, le mot de passe n'est pas hashé pour faciliter les tests
    // En production, utiliser bcrypt.hash() pour générer le hash
    let passwordValid = false;

    if (process.env.NODE_ENV === 'production') {
      // En production, comparer avec hash bcrypt
      passwordValid = await bcrypt.compare(password, ADMIN_SHARED_PASSWORD);
    } else {
      // En dev, comparaison simple
      passwordValid = password === ADMIN_SHARED_PASSWORD;
    }

    if (!passwordValid) {
      return new Response(
        JSON.stringify({
          error: 'Mot de passe incorrect',
        }),
        { status: 401 }
      );
    }

    // 4. Récupérer l'admin depuis la BDD
    const admin = await prisma.admin.findUnique({
      where: { name: adminName },
    });

    if (!admin || !admin.isActive) {
      return new Response(
        JSON.stringify({
          error: 'Administrateur non trouvé ou désactivé',
        }),
        { status: 401 }
      );
    }

    // 5. Vérifier le code 2FA
    const is2FAValid = await verify2FAToken(token2FA, admin.secret2FA);

    if (!is2FAValid) {
      return new Response(
        JSON.stringify({
          error: 'Code 2FA invalide',
        }),
        { status: 401 }
      );
    }

    // 6. Générer le JWT token
    const jwtToken = generateToken(admin.id, admin.name);

    // 7. Créer la session en BDD (optionnel, pour tracking)
    await prisma.session.create({
      data: {
        adminName: admin.name,
        token: jwtToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    // 8. Retourner le cookie + données admin
    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createAuthCookie(jwtToken),
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors du login:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

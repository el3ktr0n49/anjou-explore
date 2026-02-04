/**
 * POST /api/admin/change-password
 *
 * Permet à un admin de changer son mot de passe
 *
 * Body:
 * {
 *   currentPassword: string,
 *   newPassword: string,
 *   confirmPassword: string
 * }
 *
 * Response success (200):
 * {
 *   success: true,
 *   message: string
 * }
 *
 * Response error (400/401):
 * {
 *   error: string
 * }
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/db/client';
import { requireAuth } from '../../../lib/auth/middleware';

export const POST: APIRoute = async (context) => {
  try {
    // 1. Vérifier l'authentification
    const admin = await requireAuth(context);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401 }
      );
    }

    // 2. Parser le body
    const body = await context.request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // 3. Validation des inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Les mots de passe ne correspondent pas' }),
        { status: 400 }
      );
    }

    // 4. Validation de la complexité du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      return new Response(
        JSON.stringify({
          error:
            'Le mot de passe doit contenir au moins 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)',
        }),
        { status: 400 }
      );
    }

    // 5. Récupérer l'admin depuis la BDD
    const adminData = await prisma.admin.findUnique({
      where: { id: admin.adminId },
    });

    if (!adminData) {
      return new Response(
        JSON.stringify({ error: 'Administrateur non trouvé' }),
        { status: 404 }
      );
    }

    // 6. Vérifier le mot de passe actuel
    const passwordValid = await bcrypt.compare(currentPassword, adminData.password);

    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: 'Mot de passe actuel incorrect' }),
        { status: 401 }
      );
    }

    // 7. Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 8. Mettre à jour l'admin
    await prisma.admin.update({
      where: { id: admin.adminId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    // 9. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe changé avec succès',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500 }
    );
  }
};

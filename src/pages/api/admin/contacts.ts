// Force SSR : Route API protégée qui accède à request.headers
export const prerender = false;

/**
 * GET /api/admin/contacts
 *
 * Liste toutes les demandes de contact avec filtres
 *
 * Query params:
 * - status: NEW | PROCESSED | ARCHIVED (optionnel)
 * - isBooking: true | false (optionnel)
 *
 * Response (200):
 * {
 *   contacts: ContactRequest[],
 *   total: number
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../lib/db/client';
import { requireAuth } from '../../../lib/auth/middleware';

// Schema de validation pour les query params
const querySchema = z.object({
  status: z.enum(['NEW', 'PROCESSED', 'ARCHIVED']).optional(),
  isBooking: z.enum(['true', 'false']).optional(),
});

export const GET: APIRoute = async (context) => {
  try {
    // 1. Vérifier l'authentification
    const admin = await requireAuth(context);
    if (!admin) {
      return new Response(
        JSON.stringify({
          error: 'Non autorisé',
        }),
        { status: 401 }
      );
    }

    // 2. Parser et valider les query params
    const url = new URL(context.request.url);
    const queryParams = {
      status: url.searchParams.get('status') || undefined,
      isBooking: url.searchParams.get('isBooking') || undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Paramètres invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { status, isBooking } = validationResult.data;

    // 3. Construire le filtre Prisma
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (isBooking !== undefined) {
      where.isBooking = isBooking === 'true';
    }

    // 4. Récupérer les contacts avec tri par date (plus récents en premier)
    const contacts = await prisma.contactRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Compter le total
    const total = await prisma.contactRequest.count({ where });

    // 6. Retourner les résultats
    return new Response(
      JSON.stringify({
        contacts,
        total,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des contacts:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

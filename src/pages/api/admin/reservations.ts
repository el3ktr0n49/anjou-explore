/**
 * GET /api/admin/reservations
 *
 * Liste toutes les réservations avec filtres
 *
 * Query params:
 * - eventId: UUID de l'événement (optionnel)
 * - paymentStatus: PENDING | PAID | FAILED | REFUNDED | CANCELLED (optionnel)
 *
 * Response (200):
 * {
 *   reservations: Reservation[],
 *   total: number,
 *   totalAmount: number
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../lib/db/client';
import { requireAuth } from '../../../lib/auth/middleware';

// Schema de validation pour les query params
const querySchema = z.object({
  eventId: z.string().uuid().optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  archived: z.enum(['true', 'false']).optional(),
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
      eventId: url.searchParams.get('eventId') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') || undefined,
      archived: url.searchParams.get('archived') || undefined,
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

    const { eventId, paymentStatus, archived } = validationResult.data;

    // 3. Construire le filtre Prisma
    const where: any = {};
    if (eventId) {
      where.eventId = eventId;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    // Par défaut, ne montrer que les réservations non archivées
    if (archived === 'true') {
      where.archived = true;
    } else if (archived === 'false') {
      where.archived = false;
    } else {
      // Si non spécifié, afficher uniquement les non-archivées
      where.archived = false;
    }

    // 4. Récupérer les réservations avec tri par date (plus récentes en premier)
    // + inclure les infos de l'événement associé + transactions de paiement
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        event: {
          select: {
            name: true,
            slug: true,
            date: true,
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Compter le total
    const total = await prisma.reservation.count({ where });

    // 6. Calculer le montant total
    const amountAggregate = await prisma.reservation.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    const totalAmount = amountAggregate._sum.amount ? Number(amountAggregate._sum.amount) : 0;

    // 7. Retourner les résultats
    return new Response(
      JSON.stringify({
        reservations,
        total,
        totalAmount,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

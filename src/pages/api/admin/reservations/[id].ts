// Force SSR : Route API avec paramètre dynamique [id]
export const prerender = false;

/**
 * PUT /api/admin/reservations/[id]
 * Mettre à jour le statut de paiement d'une réservation
 *
 * Body:
 * {
 *   paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED",
 *   sumupTransactionId?: string,
 *   notes?: string
 * }
 *
 * PATCH /api/admin/reservations/[id]
 * Archiver ou désarchiver une réservation
 *
 * Body:
 * {
 *   archived: boolean
 * }
 *
 * DELETE /api/admin/reservations/[id]
 * Supprimer définitivement une réservation (confirmation requise)
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { prisma } from '../../../../lib/db/client';
import { requireAuth } from '../../../../lib/auth/middleware';

// Schema de validation pour PUT
const updateSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']),
  sumupTransactionId: z.string().optional(),
  notes: z.string().optional(),
});

// Schema de validation pour PATCH (archivage)
const archiveSchema = z.object({
  archived: z.boolean(),
});

export const PUT: APIRoute = async (context) => {
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

    // 2. Récupérer l'ID de la réservation depuis l'URL
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Parser et valider le body
    const body = await context.request.json();
    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { paymentStatus, sumupTransactionId, notes } = validationResult.data;

    // 4. Vérifier que la réservation existe + charger les transactions
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!existingReservation) {
      return new Response(
        JSON.stringify({
          error: 'Réservation introuvable',
        }),
        { status: 404 }
      );
    }

    // 5. Vérifier si passage à PAID est autorisé
    if (paymentStatus === 'PAID') {
      // Ne permettre le passage à PAID manuellement que s'il n'y a PAS de transactions SumUp actives
      const hasActiveTransactions = existingReservation.paymentTransactions.some(
        (t) => t.status === 'INITIATED' || t.status === 'PENDING'
      );

      if (hasActiveTransactions) {
        return new Response(
          JSON.stringify({
            error: 'Impossible de marquer comme payé manuellement',
            message:
              'Cette réservation a des transactions SumUp en cours. Le paiement doit être validé via SumUp.',
          }),
          { status: 400 }
        );
      }
    }

    // 6. Construire les données de mise à jour
    const updateData: any = {
      paymentStatus,
    };

    if (sumupTransactionId !== undefined) {
      updateData.sumupTransactionId = sumupTransactionId;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Si le statut passe à PAID, enregistrer la date de paiement
    if (paymentStatus === 'PAID' && existingReservation.paymentStatus !== 'PAID') {
      updateData.paidAt = new Date();
    }

    // 7. Mettre à jour la réservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // 8. Retourner la réservation mise à jour
    return new Response(
      JSON.stringify({
        success: true,
        reservation: updatedReservation,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

export const PATCH: APIRoute = async (context) => {
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

    // 2. Récupérer l'ID de la réservation depuis l'URL
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Parser et valider le body
    const body = await context.request.json();
    const validationResult = archiveSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { archived } = validationResult.data;

    // 4. Vérifier que la réservation existe
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      return new Response(
        JSON.stringify({
          error: 'Réservation introuvable',
        }),
        { status: 404 }
      );
    }

    // 5. Mettre à jour le statut d'archivage
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        archived,
        archivedAt: archived ? new Date() : null,
        archivedBy: archived ? admin.name : null,
      },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
        paymentTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // 6. Retourner la réservation mise à jour
    return new Response(
      JSON.stringify({
        success: true,
        reservation: updatedReservation,
        message: archived ? 'Réservation archivée' : 'Réservation désarchivée',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de l\'archivage de la réservation:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

export const DELETE: APIRoute = async (context) => {
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

    // 2. Récupérer l'ID de la réservation depuis l'URL
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que la réservation existe
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      return new Response(
        JSON.stringify({
          error: 'Réservation introuvable',
        }),
        { status: 404 }
      );
    }

    // 4. Supprimer la réservation
    await prisma.reservation.delete({
      where: { id },
    });

    // 5. Retourner la confirmation
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réservation supprimée',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la réservation:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

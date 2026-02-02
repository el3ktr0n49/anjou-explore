/**
 * POST /api/public/payments/checkout
 *
 * Initialise un paiement SumUp pour une réservation ou un groupe de réservations.
 *
 * Body: { groupId?: string, reservationId?: string } (un des deux requis)
 * Response: { checkoutUrl: string, checkoutId: string }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { createCheckout } from '../../../../lib/services/sumupService';
import { Prisma } from '@prisma/client';

// ============================================================================
// VALIDATION
// ============================================================================

const checkoutRequestSchema = z.object({
  groupId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
}).refine(data => data.groupId || data.reservationId, {
  message: 'groupId ou reservationId requis',
});

// ============================================================================
// HANDLER
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parser et valider le body
    const body = await request.json();
    const { groupId, reservationId } = checkoutRequestSchema.parse(body);

    // 2. Récupérer les réservations (soit par groupId, soit une seule)
    const reservations = await prisma.reservation.findMany({
      where: groupId
        ? { groupId }
        : { id: reservationId },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
        activity: {
          select: {
            name: true,
          },
        },
        paymentTransactions: {
          where: {
            status: {
              in: ['INITIATED', 'PENDING'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (reservations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Réservation(s) introuvable(s)' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const firstReservation = reservations[0];

    // 3. Vérifier qu'aucune réservation n'est déjà payée
    if (reservations.some(r => r.paymentStatus === 'PAID')) {
      return new Response(
        JSON.stringify({ error: 'Une ou plusieurs réservations sont déjà payées' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier qu'il n'y a pas déjà une transaction en cours
    const activeTransactions = reservations
      .flatMap(r => r.paymentTransactions)
      .filter(t => t !== null);

    if (activeTransactions.length > 0) {
      const activeTransaction = activeTransactions[0];

      // Si transaction récente (moins de 1h), retourner l'URL existante
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (activeTransaction.initiatedAt > oneHourAgo && activeTransaction.checkoutUrl) {
        return new Response(
          JSON.stringify({
            checkoutUrl: activeTransaction.checkoutUrl,
            checkoutId: activeTransaction.checkoutId,
            existing: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Sinon, marquer toutes les anciennes transactions comme EXPIRED
      for (const transaction of activeTransactions) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'EXPIRED',
            expiredAt: new Date(),
          },
        });
      }
    }

    // 5. Calculer le montant total
    const totalAmount = reservations.reduce(
      (sum, r) => sum.add(new Prisma.Decimal(r.amount)),
      new Prisma.Decimal(0)
    );

    // 6. Construire la description (liste des activités)
    const activitiesDescription = reservations
      .map(r => r.activity?.name || r.activityName)
      .filter((name, index, self) => self.indexOf(name) === index) // Unique
      .join(', ');

    // 7. Construire l'URL de retour
    const appUrl = process.env.APP_URL || 'http://localhost:4321';
    const returnParam = groupId ? `groupId=${groupId}` : `reservationId=${reservationId}`;
    const redirectUrl = `${appUrl}/payment/return?${returnParam}`;

    // 8. Créer le checkout SumUp
    const checkout = await createCheckout({
      amount: Number(totalAmount),
      currency: 'EUR',
      checkoutReference: groupId || reservationId || '',
      description: `${firstReservation.event.name} - ${activitiesDescription} - ${firstReservation.prenom} ${firstReservation.nom}`,
      redirectUrl,
    });

    // 9. Créer une transaction de paiement pour chaque réservation
    for (const reservation of reservations) {
      await prisma.paymentTransaction.create({
        data: {
          reservationId: reservation.id,
          checkoutId: checkout.id,
          amount: reservation.amount,
          currency: 'EUR',
          status: 'INITIATED',
          checkoutUrl: checkout.hostedCheckoutUrl,
          sumupResponse: checkout as any,
        },
      });
    }

    // 10. Retourner l'URL de checkout
    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkout.hostedCheckoutUrl,
        checkoutId: checkout.id,
        reservationsCount: reservations.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Erreur création checkout:', error);

    // Erreur de validation Zod
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Erreur générique
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de l\'initialisation du paiement',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

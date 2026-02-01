/**
 * POST /api/public/payments/checkout
 *
 * Initialise un paiement SumUp pour une réservation.
 *
 * Body: { reservationId: string }
 * Response: { checkoutUrl: string, checkoutId: string }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { createCheckout } from '../../../../lib/services/sumupService';

// ============================================================================
// VALIDATION 
// ============================================================================

const checkoutRequestSchema = z.object({
  reservationId: z.string().uuid(),
});

// ============================================================================
// HANDLER
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parser et valider le body
    const body = await request.json();
    const { reservationId } = checkoutRequestSchema.parse(body);

    // 2. Récupérer la réservation avec l'événement
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
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

    if (!reservation) {
      return new Response(
        JSON.stringify({ error: 'Réservation introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Vérifier que la réservation n'est pas déjà payée
    if (reservation.paymentStatus === 'PAID') {
      return new Response(
        JSON.stringify({ error: 'Cette réservation est déjà payée' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier qu'il n'y a pas déjà une transaction en cours
    if (reservation.paymentTransactions.length > 0) {
      const activeTransaction = reservation.paymentTransactions[0];

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

      // Sinon, marquer l'ancienne transaction comme EXPIRED
      await prisma.paymentTransaction.update({
        where: { id: activeTransaction.id },
        data: {
          status: 'EXPIRED',
          expiredAt: new Date(),
        },
      });
    }

    // 5. Construire l'URL de retour
    const appUrl = process.env.APP_URL || 'http://localhost:4321';
    const redirectUrl = `${appUrl}/payment/return?reservationId=${reservationId}`;

    // 6. Créer le checkout SumUp
    const checkout = await createCheckout({
      amount: Number(reservation.amount),
      currency: 'EUR',
      checkoutReference: reservationId,
      description: `Réservation ${reservation.event.name} - ${reservation.prenom} ${reservation.nom}`,
      redirectUrl,
    });

    // 7. Créer la transaction de paiement en BDD
    await prisma.paymentTransaction.create({
      data: {
        reservationId: reservation.id,
        checkoutId: checkout.id,
        amount: reservation.amount,
        currency: 'EUR',
        status: 'INITIATED',
        checkoutUrl: checkout.hostedCheckoutUrl,
        sumupResponse: checkout as any, // Stocker la réponse complète
      },
    });

    // 8. Retourner l'URL de checkout
    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkout.hostedCheckoutUrl,
        checkoutId: checkout.id,
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

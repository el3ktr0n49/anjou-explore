// Force SSR : Route API
export const prerender = false;

/**
 * POST /api/webhooks/sumup
 *
 * Webhook appelé par SumUp lorsqu'un paiement est complété, échoué, ou annulé.
 *
 * Note: La documentation SumUp ne spécifie pas exactement le format du payload webhook.
 * Ce endpoint est conçu pour être flexible et vérifier toujours le statut via l'API.
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db/client';
import { getCheckout } from '../../../lib/services/sumupService';
import { sendPaymentConfirmationEmail } from '../../../lib/email/templates';

// ============================================================================
// HELPERS
// ============================================================================

function log(...args: any[]) {
  console.log(`[${new Date().toISOString()}] [Webhook SumUp]`, ...args);
}

function logError(...args: any[]) {
  console.error(`[${new Date().toISOString()}] [Webhook SumUp]`, ...args);
}

// ============================================================================
// HANDLER
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parser le payload du webhook
    const payload = await request.json();
    log('Payload reçu:', JSON.stringify(payload));

    // 2. Extraire le checkoutId (le format exact peut varier)
    const checkoutId =
      payload.checkout_id ||
      payload.checkoutId ||
      payload.id ||
      payload.data?.id ||
      payload.event_data?.id;

    if (!checkoutId) {
      logError('checkoutId manquant dans le payload');
      return new Response(
        JSON.stringify({ error: 'checkoutId manquant' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Idempotence : vérifier si déjà traité
    //    SumUp peut appeler le webhook plusieurs fois pour le même checkout
    const alreadyPaid = await prisma.reservation.findFirst({
      where: {
        sumupCheckoutId: checkoutId,
        paymentStatus: 'PAID',
      },
    });

    if (alreadyPaid) {
      log(`Checkout ${checkoutId} déjà traité (réservation ${alreadyPaid.id} PAID), skip`);
      return new Response(
        JSON.stringify({ success: true, checkoutId, status: 'PAID', alreadyProcessed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Récupérer TOUTES les transactions avec ce checkoutId (groupe possible)
    const transactions = await prisma.paymentTransaction.findMany({
      where: { checkoutId },
      include: {
        reservation: {
          include: {
            event: {
              select: {
                name: true,
                slug: true,
                date: true,
              },
            },
            activity: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (transactions.length === 0) {
      logError('Aucune transaction trouvée pour checkoutId:', checkoutId);
      return new Response(
        JSON.stringify({ error: 'Transaction introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    log(`${transactions.length} transaction(s) trouvée(s)`);

    // 5. Vérifier le statut réel via l'API SumUp (sécurité)
    const checkout = await getCheckout(checkoutId);
    log('Statut checkout:', checkout.status);

    // 6. Préparer les données de mise à jour selon le statut
    let updateData: any = {
      sumupResponse: checkout as any,
    };

    if (checkout.status === 'PAID') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.transactionId = checkout.transactionId;
    } else if (checkout.status === 'FAILED') {
      updateData.status = 'FAILED';
    } else if (checkout.status === 'CANCELLED') {
      updateData.status = 'CANCELLED';
    } else if (checkout.status === 'EXPIRED') {
      updateData.status = 'EXPIRED';
      updateData.expiredAt = new Date();
    }

    // Mettre à jour TOUTES les transactions avec ce checkoutId
    await prisma.paymentTransaction.updateMany({
      where: { checkoutId },
      data: updateData,
    });

    log(`${transactions.length} transaction(s) mise(s) à jour: ${updateData.status}`);

    // 7. Si paiement réussi, mettre à jour les réservations + envoyer email
    if (checkout.status === 'PAID') {
      const reservationIds = transactions.map(t => t.reservation.id);

      // Idempotence atomique : ne mettre à jour QUE les réservations pas encore PAID
      // PostgreSQL garantit qu'un seul updateMany réussira en cas d'appels concurrents
      const updated = await prisma.reservation.updateMany({
        where: { id: { in: reservationIds }, paymentStatus: { not: 'PAID' } },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          sumupCheckoutId: checkoutId,
          sumupTransactionId: checkout.transactionId,
        },
      });

      log(`${updated.count}/${reservationIds.length} réservation(s) mise(s) à jour: PAID`);

      // 8. Envoyer l'email SEULEMENT si on a réellement mis à jour des réservations
      if (updated.count > 0) {
        try {
          const firstReservation = transactions[0].reservation;

          await sendPaymentConfirmationEmail({
            to: firstReservation.email,
            reservation: {
              id: firstReservation.id,
              nom: firstReservation.nom,
              prenom: firstReservation.prenom,
              eventName: firstReservation.event.name,
              eventDate: firstReservation.event.date,
              activityName: transactions.map(t => t.reservation.activity?.name || t.reservation.activityName).join(', '),
              participants: firstReservation.participants as any,
              amount: transactions.reduce((sum, t) => sum + Number(t.reservation.amount), 0),
            },
            activities: transactions.map(t => ({
              name: t.reservation.activity?.name || t.reservation.activityName,
              participants: t.reservation.participants as Record<string, number>,
              amount: Number(t.reservation.amount),
            })),
          });
          log('Email de confirmation envoyé');
        } catch (emailError) {
          logError('Erreur envoi email:', emailError);
        }
      } else {
        log('Appel webhook dupliqué (réservations déjà PAID), email non renvoyé');
      }
    }

    // 9. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        checkoutId,
        status: checkout.status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('Erreur:', error);

    return new Response(
      JSON.stringify({
        error: 'Erreur lors du traitement du webhook',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

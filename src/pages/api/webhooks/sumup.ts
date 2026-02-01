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
// HANDLER
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parser le payload du webhook
    const payload = await request.json();
    console.log('[Webhook SumUp] Payload reçu:', JSON.stringify(payload, null, 2));

    // 2. Extraire le checkoutId (le format exact peut varier)
    // Possibilités : payload.checkout_id, payload.id, payload.data.id, etc.
    const checkoutId =
      payload.checkout_id ||
      payload.checkoutId ||
      payload.id ||
      payload.data?.id ||
      payload.event_data?.id;

    if (!checkoutId) {
      console.error('[Webhook SumUp] checkoutId manquant dans le payload');
      return new Response(
        JSON.stringify({ error: 'checkoutId manquant' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Récupérer la transaction depuis la BDD
    const transaction = await prisma.paymentTransaction.findFirst({
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
          },
        },
      },
    });

    if (!transaction) {
      console.error('[Webhook SumUp] Transaction introuvable pour checkoutId:', checkoutId);
      return new Response(
        JSON.stringify({ error: 'Transaction introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier le statut réel via l'API SumUp (sécurité)
    const checkout = await getCheckout(checkoutId);
    console.log('[Webhook SumUp] Statut checkout:', checkout.status);

    // 5. Mettre à jour la transaction selon le statut
    let updateData: any = {
      status: checkout.status,
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

    // Mettre à jour la transaction
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: updateData,
    });

    // 6. Si paiement réussi, mettre à jour la réservation
    if (checkout.status === 'PAID') {
      await prisma.reservation.update({
        where: { id: transaction.reservationId },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          sumupCheckoutId: checkoutId,
          sumupTransactionId: checkout.transactionId,
        },
      });

      // 7. Envoyer email de confirmation
      try {
        await sendPaymentConfirmationEmail({
          to: transaction.reservation.email,
          reservation: {
            id: transaction.reservation.id,
            nom: transaction.reservation.nom,
            prenom: transaction.reservation.prenom,
            eventName: transaction.reservation.event.name,
            eventDate: transaction.reservation.event.date,
            activityName: transaction.reservation.activityName,
            participants: transaction.reservation.participants as any,
            amount: Number(transaction.reservation.amount),
          },
        });
        console.log('[Webhook SumUp] Email de confirmation envoyé');
      } catch (emailError) {
        console.error('[Webhook SumUp] Erreur envoi email:', emailError);
        // Ne pas bloquer le webhook si l'email échoue
      }
    }

    // 8. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        checkoutId,
        status: checkout.status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Webhook SumUp] Erreur:', error);

    return new Response(
      JSON.stringify({
        error: 'Erreur lors du traitement du webhook',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

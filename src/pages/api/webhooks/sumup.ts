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

    // 3. Récupérer TOUTES les transactions avec ce checkoutId (groupe possible)
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
      console.error('[Webhook SumUp] Aucune transaction trouvée pour checkoutId:', checkoutId);
      return new Response(
        JSON.stringify({ error: 'Transaction introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Webhook SumUp] ${transactions.length} transaction(s) trouvée(s)`);

    // 4. Vérifier le statut réel via l'API SumUp (sécurité)
    const checkout = await getCheckout(checkoutId);
    console.log('[Webhook SumUp] Statut checkout:', checkout.status);

    // 5. Préparer les données de mise à jour selon le statut
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

    console.log(`[Webhook SumUp] ${transactions.length} transaction(s) mise(s) à jour: ${updateData.status}`);

    // 6. Si paiement réussi, mettre à jour TOUTES les réservations
    if (checkout.status === 'PAID') {
      const reservationIds = transactions.map(t => t.reservation.id);

      await prisma.reservation.updateMany({
        where: { id: { in: reservationIds } },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          sumupCheckoutId: checkoutId,
          sumupTransactionId: checkout.transactionId,
        },
      });

      console.log(`[Webhook SumUp] ${reservationIds.length} réservation(s) mise(s) à jour: PAID`);

      // 7. Envoyer UN email de confirmation avec TOUTES les activités
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
          // Liste détaillée des activités pour affichage email
          activities: transactions.map(t => ({
            name: t.reservation.activity?.name || t.reservation.activityName,
            participants: t.reservation.participants as Record<string, number>,
            amount: Number(t.reservation.amount),
          })),
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

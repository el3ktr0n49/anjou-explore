// Force SSR : Route API qui accède à la DB
export const prerender = false;

/**
 * GET /api/public/payments/check-status?groupId=xxx  OU  ?reservationId=xxx
 *
 * Endpoint de fallback pour vérifier le statut d'un paiement
 * Utilisé en développement local quand le webhook ne fonctionne pas
 *
 * Ce endpoint :
 * 1. Récupère les réservations (par groupId ou reservationId)
 * 2. Trouve les transactions PaymentTransaction en cours
 * 3. Vérifie le statut via l'API SumUp
 * 4. Met à jour la BDD si nécessaire
 * 5. Retourne le statut actuel
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { getCheckout } from '../../../../lib/services/sumupService';
import { sendPaymentConfirmationEmail } from '../../../../lib/email/templates';

// ============================================================================
// VALIDATION
// ============================================================================

const checkStatusSchema = z.object({
  groupId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
}).refine(data => data.groupId || data.reservationId, {
  message: 'groupId ou reservationId requis',
});

// ============================================================================
// HANDLER
// ============================================================================

export const GET: APIRoute = async ({ url }) => {
  try {
    // 1. Valider les paramètres
    const groupId = url.searchParams.get('groupId') || undefined;
    const reservationId = url.searchParams.get('reservationId') || undefined;
    const validated = checkStatusSchema.parse({ groupId, reservationId });

    // 2. Récupérer les réservations avec les dernières transactions
    const reservations = await prisma.reservation.findMany({
      where: validated.groupId
        ? { groupId: validated.groupId }
        : { id: validated.reservationId },
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

    // 3. Si toutes les réservations sont déjà payées, retourner le statut
    const allPaid = reservations.every(r => r.paymentStatus === 'PAID');

    if (allPaid) {
      return new Response(
        JSON.stringify({
          status: 'PAID',
          message: 'Paiement confirmé',
          reservationsCount: reservations.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Récupérer toutes les transactions en cours
    const activeTransactions = reservations
      .flatMap(r => r.paymentTransactions)
      .filter(t => t !== null);

    if (activeTransactions.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'PENDING',
          message: 'Aucune transaction en cours',
          reservationsCount: reservations.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Vérifier le statut via l'API SumUp (utiliser la première transaction)
    const transaction = activeTransactions[0];

    console.log('[Check Status] Vérification du checkout SumUp:', transaction.checkoutId);

    const checkout = await getCheckout(transaction.checkoutId);

    console.log('[Check Status] Statut SumUp:', checkout.status);

    // 6. Mettre à jour toutes les transactions avec le même checkoutId
    let needsUpdate = false;
    let updateData: any = {
      sumupResponse: checkout as any,
    };

    if (checkout.status === 'PAID' && transaction.status !== 'COMPLETED') {
      needsUpdate = true;
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.transactionId = checkout.transactionId;
    } else if (checkout.status === 'FAILED' && transaction.status !== 'FAILED') {
      needsUpdate = true;
      updateData.status = 'FAILED';
    } else if (checkout.status === 'CANCELLED' && transaction.status !== 'CANCELLED') {
      needsUpdate = true;
      updateData.status = 'CANCELLED';
    } else if (checkout.status === 'EXPIRED' && transaction.status !== 'EXPIRED') {
      needsUpdate = true;
      updateData.status = 'EXPIRED';
      updateData.expiredAt = new Date();
    }

    if (needsUpdate) {
      // Mettre à jour toutes les transactions avec ce checkoutId
      await prisma.paymentTransaction.updateMany({
        where: { checkoutId: transaction.checkoutId },
        data: updateData,
      });

      console.log('[Check Status] Transactions mises à jour:', updateData.status);

      // 7. Si paiement réussi, mettre à jour toutes les réservations
      if (checkout.status === 'PAID') {
        const reservationIds = reservations.map(r => r.id);

        await prisma.reservation.updateMany({
          where: { id: { in: reservationIds } },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
            sumupCheckoutId: transaction.checkoutId,
            sumupTransactionId: checkout.transactionId,
          },
        });

        console.log(`[Check Status] ${reservations.length} réservation(s) mise(s) à jour: PAID`);

        // 8. Envoyer UN seul email de confirmation avec toutes les activités
        const firstReservation = reservations[0];

        try {
          await sendPaymentConfirmationEmail({
            to: firstReservation.email,
            reservation: {
              id: firstReservation.id,
              nom: firstReservation.nom,
              prenom: firstReservation.prenom,
              eventName: firstReservation.event.name,
              eventDate: firstReservation.event.date,
              activityName: reservations.map(r => r.activity?.name || r.activityName).join(', '),
              participants: firstReservation.participants as any,
              amount: reservations.reduce((sum, r) => sum + Number(r.amount), 0),
            },
            // Liste détaillée des activités pour affichage email
            activities: reservations.map(r => ({
              name: r.activity?.name || r.activityName,
              participants: r.participants as Record<string, number>,
              amount: Number(r.amount),
            })),
          });
          console.log('[Check Status] Email de confirmation envoyé');
        } catch (emailError) {
          console.error('[Check Status] Erreur envoi email:', emailError);
          // Ne pas bloquer si l'email échoue
        }

        return new Response(
          JSON.stringify({
            status: 'PAID',
            message: 'Paiement confirmé',
            updated: true,
            reservationsCount: reservations.length,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 9. Retourner le statut actuel
    return new Response(
      JSON.stringify({
        status: checkout.status,
        message: `Statut : ${checkout.status}`,
        updated: needsUpdate,
        reservationsCount: reservations.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Check Status] Erreur:', error);

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
        error: 'Erreur lors de la vérification du statut',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

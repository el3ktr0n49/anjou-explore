/**
 * GET /api/public/payments/check-status?reservationId=xxx
 *
 * Endpoint de fallback pour vérifier le statut d'un paiement
 * Utilisé en développement local quand le webhook ne fonctionne pas
 *
 * Ce endpoint :
 * 1. Récupère la réservation
 * 2. Trouve la dernière transaction PaymentTransaction
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
  reservationId: z.string().uuid(),
});

// ============================================================================
// HANDLER
// ============================================================================

export const GET: APIRoute = async ({ url }) => {
  try {
    // 1. Valider les paramètres
    const reservationId = url.searchParams.get('reservationId') || undefined;
    const { reservationId: validatedId } = checkStatusSchema.parse({ reservationId });

    // 2. Récupérer la réservation avec la dernière transaction
    const reservation = await prisma.reservation.findUnique({
      where: { id: validatedId },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
            date: true,
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

    // 3. Si déjà payé, retourner le statut
    if (reservation.paymentStatus === 'PAID') {
      return new Response(
        JSON.stringify({
          status: 'PAID',
          message: 'Paiement confirmé',
          reservation: {
            id: reservation.id,
            paymentStatus: reservation.paymentStatus,
            paidAt: reservation.paidAt,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Si pas de transaction en cours, retourner le statut actuel
    if (reservation.paymentTransactions.length === 0) {
      return new Response(
        JSON.stringify({
          status: reservation.paymentStatus,
          message: 'Aucune transaction en cours',
          reservation: {
            id: reservation.id,
            paymentStatus: reservation.paymentStatus,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transaction = reservation.paymentTransactions[0];

    // 5. Vérifier le statut via l'API SumUp
    console.log('[Check Status] Vérification du checkout SumUp:', transaction.checkoutId);

    const checkout = await getCheckout(transaction.checkoutId);

    console.log('[Check Status] Statut SumUp:', checkout.status);

    // 6. Mettre à jour la transaction selon le statut
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
      // Mettre à jour la transaction
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: updateData,
      });

      console.log('[Check Status] Transaction mise à jour:', updateData.status);

      // 7. Si paiement réussi, mettre à jour la réservation
      if (checkout.status === 'PAID') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
            sumupCheckoutId: transaction.checkoutId,
            sumupTransactionId: checkout.transactionId,
          },
        });

        console.log('[Check Status] Réservation mise à jour: PAID');

        // 8. Envoyer email de confirmation
        try {
          await sendPaymentConfirmationEmail({
            to: reservation.email,
            reservation: {
              id: reservation.id,
              nom: reservation.nom,
              prenom: reservation.prenom,
              eventName: reservation.event.name,
              eventDate: reservation.event.date,
              activityName: reservation.activityName,
              participants: reservation.participants as any,
              amount: Number(reservation.amount),
            },
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
            reservation: {
              id: reservation.id,
              paymentStatus: 'PAID',
              paidAt: new Date(),
            },
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
        reservation: {
          id: reservation.id,
          paymentStatus: reservation.paymentStatus,
        },
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

// Force SSR : Route API protégée qui accède à request.headers
export const prerender = false;

/**
 * GET /api/admin/stats
 *
 * Retourne les statistiques pour le dashboard admin :
 * - Contacts : nombre de demandes non traitées (toujours pertinent)
 * - Réservations & Revenus : contextualisés sur l'événement actif (OPEN, le plus proche en date)
 *
 * Response (200):
 * {
 *   contactsNew: number,
 *   activeEvent: {
 *     name: string,
 *     slug: string,
 *     reservationsTotal: number,
 *     totalParticipants: number,
 *     revenuePaid: number,
 *     revenuePending: number,
 *   } | null
 * }
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db/client';
import { requireAuth } from '../../../lib/auth/middleware';

export const GET: APIRoute = async (context) => {
  try {
    // 1. Vérifier l'authentification
    const admin = await requireAuth(context);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    // 2. Récupérer contacts NEW + événement actif en parallèle
    const [contactsNew, activeEvent] = await Promise.all([
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
      // Événement OPEN le plus proche en date
      prisma.event.findFirst({
        where: { status: 'OPEN' },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          reservations: {
            where: { archived: false },
            select: {
              amount: true,
              paymentStatus: true,
              participants: true,
            },
          },
        },
      }),
    ]);

    // 3. Calculer les stats de l'événement actif
    let activeEventStats = null;

    if (activeEvent) {
      let totalParticipants = 0;
      let revenuePaid = 0;
      let revenuePending = 0;

      for (const reservation of activeEvent.reservations) {
        // Participants
        const participants = reservation.participants as Record<string, number>;
        totalParticipants += Object.values(participants).reduce((sum, qty) => sum + qty, 0);

        // Revenus
        const amount = Number(reservation.amount);
        if (reservation.paymentStatus === 'PAID') revenuePaid += amount;
        if (reservation.paymentStatus === 'PENDING') revenuePending += amount;
      }

      activeEventStats = {
        name: activeEvent.name,
        slug: activeEvent.slug,
        reservationsTotal: activeEvent.reservations.length,
        totalParticipants,
        revenuePaid: Math.round(revenuePaid * 100) / 100,
        revenuePending: Math.round(revenuePending * 100) / 100,
      };
    }

    // 4. Retourner les statistiques
    return new Response(
      JSON.stringify({
        contactsNew,
        activeEvent: activeEventStats,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
};

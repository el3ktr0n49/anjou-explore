/**
 * GET /api/admin/stats
 *
 * Retourne les statistiques globales pour le dashboard admin
 *
 * Response (200):
 * {
 *   contactsNew: number,           // Nombre de demandes de contact non traitées
 *   reservationsTotal: number,     // Nombre total de réservations
 *   revenuePending: number,        // Revenu en attente (paiements PENDING)
 *   revenuePaid: number            // Revenu encaissé (paiements PAID)
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
      return new Response(
        JSON.stringify({
          error: 'Non autorisé',
        }),
        { status: 401 }
      );
    }

    // 2. Récupérer toutes les statistiques en parallèle pour optimiser les performances
    const [contactsNew, reservationsTotal, revenuePending, revenuePaid] = await Promise.all([
      // Nombre de demandes de contact avec status = NEW
      prisma.contactRequest.count({
        where: {
          status: 'NEW',
        },
      }),

      // Nombre total de réservations
      prisma.reservation.count(),

      // Somme des montants des réservations en attente (PENDING)
      prisma.reservation.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          paymentStatus: 'PENDING',
        },
      }),

      // Somme des montants des réservations payées (PAID)
      prisma.reservation.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          paymentStatus: 'PAID',
        },
      }),
    ]);

    // 3. Formater les résultats (convertir Decimal en number, gérer null)
    const stats = {
      contactsNew,
      reservationsTotal,
      revenuePending: revenuePending._sum.amount ? Number(revenuePending._sum.amount) : 0,
      revenuePaid: revenuePaid._sum.amount ? Number(revenuePaid._sum.amount) : 0,
    };

    // 4. Retourner les statistiques
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

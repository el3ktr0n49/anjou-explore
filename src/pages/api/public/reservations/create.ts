/**
 * API Route publique pour créer une réservation événement
 *
 * POST /api/public/reservations/create
 * - Crée une réservation pour un événement
 * - Vérifie les inscriptions ouvertes, capacités, recalcule le montant
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════════

const reservationItemSchema = z.object({
  eventPricingId: z.string().uuid('ID de tarif invalide'),
  quantity: z.number().int().positive('La quantité doit être positive'),
});

const createReservationSchema = z.object({
  eventSlug: z.string().min(1, 'Le slug de l\'événement est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(10, 'Téléphone invalide'),
  items: z
    .array(reservationItemSchema)
    .min(1, 'Au moins un tarif doit être sélectionné')
    .max(10, 'Maximum 10 tarifs différents'),
});

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

/**
 * Vérifie si les inscriptions sont ouvertes pour un événement
 */
function areRegistrationsOpen(event: {
  status: string;
  registrationDeadline: Date | null;
  registrationOpenOverride: boolean | null;
}): boolean {
  // Si override = true → toujours ouvert
  if (event.registrationOpenOverride === true) {
    return true;
  }

  // Si override = false → toujours fermé
  if (event.registrationOpenOverride === false) {
    return false;
  }

  // Sinon, vérifier status + deadline
  if (event.status !== 'OPEN') {
    return false;
  }

  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return false;
  }

  return true;
}

/**
 * Calcule le nombre de places réservées pour une activité
 */
async function getReservedCount(activityId: string): Promise<number> {
  // Compter les participants dans toutes les réservations non annulées
  const reservations = await prisma.reservation.findMany({
    where: {
      activityId: activityId,
      paymentStatus: {
        in: ['PENDING', 'PAID'], // Exclure FAILED, REFUNDED, CANCELLED
      },
      archived: false,
    },
    select: {
      participants: true,
    },
  });

  // Sommer les quantités de participants
  let total = 0;
  for (const reservation of reservations) {
    const participants = reservation.participants as Record<string, number>;
    for (const quantity of Object.values(participants)) {
      total += quantity;
    }
  }

  return total;
}

// ═══════════════════════════════════════════════════════════
// POST - Créer une réservation
// ═══════════════════════════════════════════════════════════

export const POST: APIRoute = async (context) => {
  try {
    // 1. Parser et valider le body
    const body = await context.request.json();
    const validationResult = createReservationSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = validationResult.data;

    // 2. Récupérer l'événement avec activités et tarifs
    const event = await prisma.event.findUnique({
      where: { slug: data.eventSlug },
      include: {
        activities: {
          include: {
            pricing: true,
          },
        },
      },
    });

    if (!event) {
      return new Response(
        JSON.stringify({
          error: 'Événement introuvable',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Vérifier que les inscriptions sont ouvertes
    if (!areRegistrationsOpen(event)) {
      return new Response(
        JSON.stringify({
          error: 'Les inscriptions sont fermées pour cet événement',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier que tous les tarifs existent et calculer le montant total
    let totalAmount = new Prisma.Decimal(0);
    const participantsByActivity: Record<string, Record<string, number>> = {};

    for (const item of data.items) {
      // Trouver le tarif
      let pricing = null;
      let activity = null;

      for (const act of event.activities) {
        const foundPricing = act.pricing.find((p) => p.id === item.eventPricingId);
        if (foundPricing) {
          pricing = foundPricing;
          activity = act;
          break;
        }
      }

      if (!pricing || !activity) {
        return new Response(
          JSON.stringify({
            error: `Tarif invalide : ${item.eventPricingId}`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Ajouter au montant total
      const itemPrice = new Prisma.Decimal(pricing.price);
      totalAmount = totalAmount.add(itemPrice.mul(item.quantity));

      // Grouper les participants par activité
      if (!participantsByActivity[activity.id]) {
        participantsByActivity[activity.id] = {};
      }

      if (!participantsByActivity[activity.id][pricing.priceType]) {
        participantsByActivity[activity.id][pricing.priceType] = 0;
      }

      participantsByActivity[activity.id][pricing.priceType] += item.quantity;
    }

    // 5. Vérifier les capacités pour chaque activité
    for (const [activityId, participants] of Object.entries(participantsByActivity)) {
      const activity = event.activities.find((a) => a.id === activityId);

      if (!activity) {
        continue; // Ne devrait pas arriver
      }

      // Si maxParticipants défini, vérifier la capacité
      if (activity.maxParticipants !== null) {
        const reservedCount = await getReservedCount(activityId);
        const newParticipants = Object.values(participants).reduce((sum, qty) => sum + qty, 0);

        if (reservedCount + newParticipants > activity.maxParticipants) {
          return new Response(
            JSON.stringify({
              error: `Capacité dépassée pour l'activité "${activity.name}"`,
              details: {
                activityName: activity.name,
                maxParticipants: activity.maxParticipants,
                reserved: reservedCount,
                requested: newParticipants,
                available: activity.maxParticipants - reservedCount,
              },
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 6. Générer un groupId unique pour lier les réservations ensemble
    const groupId = crypto.randomUUID();

    // 7. Créer une réservation par activité
    const createdReservations: string[] = [];

    for (const [activityId, participants] of Object.entries(participantsByActivity)) {
      const activity = event.activities.find((a) => a.id === activityId);

      if (!activity) {
        console.error(`Activité introuvable: ${activityId}`);
        continue; // Ne devrait pas arriver grâce à la validation précédente
      }

      // Calculer le montant pour cette activité uniquement
      let activityAmount = new Prisma.Decimal(0);

      for (const [priceType, quantity] of Object.entries(participants)) {
        const pricing = activity.pricing.find((p) => p.priceType === priceType);
        if (pricing) {
          activityAmount = activityAmount.add(new Prisma.Decimal(pricing.price).mul(quantity));
        }
      }

      // Créer la réservation pour cette activité
      const reservation = await prisma.reservation.create({
        data: {
          groupId: groupId,
          eventId: event.id,
          activityId: activityId,
          activityName: activity.name,
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone,
          participants: participants,
          amount: activityAmount,
          paymentStatus: 'PENDING',
        },
      });

      createdReservations.push(reservation.id);
    }

    // 8. Retourner le groupId et le montant total
    return new Response(
      JSON.stringify({
        success: true,
        groupId: groupId,
        reservationIds: createdReservations,
        amount: totalAmount.toString(),
        message: `${createdReservations.length} réservation(s) créée(s) avec succès`,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);

    return new Response(
      JSON.stringify({
        error: 'Erreur serveur lors de la création de la réservation',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Force SSR : Route API avec paramètres dynamiques [id] et [activityId]
export const prerender = false;

/**
 * POST /api/admin/events/[id]/activities/[activityId]/pricing
 * Créer un tarif pour une activité
 *
 * Body:
 * {
 *   priceType: string,    // "adulte", "enfant", "étudiant", etc.
 *   label: string,        // "Adulte (+16 ans)"
 *   price: number         // 45.00
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../../../../lib/db/client';
import { requireAuth } from '../../../../../../../lib/auth/middleware';
import { Prisma } from '@prisma/client';

// Schema de validation pour la création de tarif
const createPricingSchema = z.object({
  priceType: z.string().min(1, 'Le type de tarif est requis'),
  label: z.string().min(1, 'Le libellé est requis'),
  price: z.number().positive('Le prix doit être positif'),
});

export const POST: APIRoute = async (context) => {
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

    // 2. Récupérer les IDs depuis les params
    const { id: eventId, activityId } = context.params;
    if (!eventId || !activityId) {
      return new Response(
        JSON.stringify({
          error: 'IDs manquants',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que l'activité existe et appartient à l'événement
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return new Response(
        JSON.stringify({
          error: 'Activité non trouvée',
        }),
        { status: 404 }
      );
    }

    if (activity.eventId !== eventId) {
      return new Response(
        JSON.stringify({
          error: 'L\'activité n\'appartient pas à cet événement',
        }),
        { status: 400 }
      );
    }

    // 4. Parser et valider le body
    const body = await context.request.json();
    const validationResult = createPricingSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { priceType, label, price } = validationResult.data;

    // 5. Vérifier que le type de tarif n'existe pas déjà pour cette activité
    const existingPricing = await prisma.eventPricing.findUnique({
      where: {
        activityId_priceType: {
          activityId,
          priceType,
        },
      },
    });

    if (existingPricing) {
      return new Response(
        JSON.stringify({
          error: 'Un tarif avec ce type existe déjà pour cette activité',
        }),
        { status: 409 }
      );
    }

    // 6. Créer le tarif
    const pricing = await prisma.eventPricing.create({
      data: {
        activityId,
        priceType,
        label,
        price: new Prisma.Decimal(price),
      },
    });

    // 7. Retourner le tarif créé
    return new Response(
      JSON.stringify({
        success: true,
        pricing,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création du tarif:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// Force SSR : Route API avec paramètres dynamiques [id] et [pricingId]
export const prerender = false;

/**
 * API Routes pour la gestion d'un tarif spécifique
 *
 * PUT /api/admin/events/[id]/pricing/[pricingId]
 * - Met à jour un tarif
 *
 * DELETE /api/admin/events/[id]/pricing/[pricingId]
 * - Supprime un tarif
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../../../lib/db/client';
import { requireAuth } from '../../../../../../lib/auth/middleware';
import { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// PUT - Mettre à jour un tarif
// ═══════════════════════════════════════════════════════════

const updatePricingSchema = z.object({
  priceType: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  price: z.number().positive().optional(),
});

export const PUT: APIRoute = async (context) => {
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
    const { id: eventId, pricingId } = context.params;
    if (!eventId || !pricingId) {
      return new Response(
        JSON.stringify({
          error: 'IDs manquants',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que le tarif existe et appartient à l'événement
    const existingPricing = await prisma.eventPricing.findUnique({
      where: { id: pricingId },
      include: {
        activity: {
          select: {
            id: true,
            eventId: true,
          },
        },
      },
    });

    if (!existingPricing) {
      return new Response(
        JSON.stringify({
          error: 'Tarif non trouvé',
        }),
        { status: 404 }
      );
    }

    if (existingPricing.activity.eventId !== eventId) {
      return new Response(
        JSON.stringify({
          error: 'Le tarif n\'appartient pas à cet événement',
        }),
        { status: 400 }
      );
    }

    // 4. Parser et valider le body
    const body = await context.request.json();
    const validationResult = updatePricingSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 5. Si changement de priceType, vérifier unicité
    if (data.priceType && data.priceType !== existingPricing.priceType) {
      const conflictingPricing = await prisma.eventPricing.findUnique({
        where: {
          activityId_priceType: {
            activityId: existingPricing.activityId,
            priceType: data.priceType,
          },
        },
      });

      if (conflictingPricing) {
        return new Response(
          JSON.stringify({
            error: 'Un tarif avec ce type existe déjà pour cette activité',
          }),
          { status: 409 }
        );
      }
    }

    // 6. Mettre à jour le tarif
    const updatedData: any = {};
    if (data.priceType !== undefined) updatedData.priceType = data.priceType;
    if (data.label !== undefined) updatedData.label = data.label;
    if (data.price !== undefined) updatedData.price = new Prisma.Decimal(data.price);

    const updatedPricing = await prisma.eventPricing.update({
      where: { id: pricingId },
      data: updatedData,
    });

    // 7. Retourner le tarif mis à jour
    return new Response(
      JSON.stringify({
        success: true,
        pricing: updatedPricing,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour du tarif:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE - Supprimer un tarif
// ═══════════════════════════════════════════════════════════

export const DELETE: APIRoute = async (context) => {
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
    const { id: eventId, pricingId } = context.params;
    if (!eventId || !pricingId) {
      return new Response(
        JSON.stringify({
          error: 'IDs manquants',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que le tarif existe et appartient à l'événement
    const existingPricing = await prisma.eventPricing.findUnique({
      where: { id: pricingId },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            eventId: true,
          },
        },
      },
    });

    if (!existingPricing) {
      return new Response(
        JSON.stringify({
          error: 'Tarif non trouvé',
        }),
        { status: 404 }
      );
    }

    if (existingPricing.activity.eventId !== eventId) {
      return new Response(
        JSON.stringify({
          error: 'Le tarif n\'appartient pas à cet événement',
        }),
        { status: 400 }
      );
    }

    // 4. Supprimer le tarif
    await prisma.eventPricing.delete({
      where: { id: pricingId },
    });

    // 5. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tarif supprimé avec succès',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du tarif:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

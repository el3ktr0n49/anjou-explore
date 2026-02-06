// Force SSR : Route API avec paramètres dynamiques [id] et [activityId]
export const prerender = false;

/**
 * API Routes pour la gestion d'une activité spécifique
 *
 * PUT /api/admin/events/[id]/activities/[activityId]
 * - Met à jour une activité
 *
 * DELETE /api/admin/events/[id]/activities/[activityId]
 * - Supprime une activité (cascade : pricing)
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../../../lib/db/client';
import { requireAuth } from '../../../../../../lib/auth/middleware';

// ═══════════════════════════════════════════════════════════
// PUT - Mettre à jour une activité
// ═══════════════════════════════════════════════════════════

const updateActivitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  maxParticipants: z.number().int().positive().optional().nullable(),
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
    const existingActivity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!existingActivity) {
      return new Response(
        JSON.stringify({
          error: 'Activité non trouvée',
        }),
        { status: 404 }
      );
    }

    if (existingActivity.eventId !== eventId) {
      return new Response(
        JSON.stringify({
          error: 'L\'activité n\'appartient pas à cet événement',
        }),
        { status: 400 }
      );
    }

    // 4. Parser et valider le body
    const body = await context.request.json();
    const validationResult = updateActivitySchema.safeParse(body);

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

    // 5. Si changement de nom, vérifier unicité
    if (data.name && data.name !== existingActivity.name) {
      const conflictingActivity = await prisma.activity.findUnique({
        where: {
          eventId_name: {
            eventId,
            name: data.name,
          },
        },
      });

      if (conflictingActivity) {
        return new Response(
          JSON.stringify({
            error: 'Une activité avec ce nom existe déjà pour cet événement',
          }),
          { status: 409 }
        );
      }
    }

    // 6. Mettre à jour l'activité
    const updatedData: any = {};
    if (data.name !== undefined) updatedData.name = data.name;
    if (data.description !== undefined) updatedData.description = data.description;
    if (data.maxParticipants !== undefined) updatedData.maxParticipants = data.maxParticipants;

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: updatedData,
      include: {
        pricing: {
          orderBy: {
            priceType: 'asc',
          },
        },
      },
    });

    // 7. Retourner l'activité mise à jour
    return new Response(
      JSON.stringify({
        success: true,
        activity: updatedActivity,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE - Supprimer une activité
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
    const existingActivity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        _count: {
          select: {
            pricing: true,
          },
        },
      },
    });

    if (!existingActivity) {
      return new Response(
        JSON.stringify({
          error: 'Activité non trouvée',
        }),
        { status: 404 }
      );
    }

    if (existingActivity.eventId !== eventId) {
      return new Response(
        JSON.stringify({
          error: 'L\'activité n\'appartient pas à cet événement',
        }),
        { status: 400 }
      );
    }

    // 4. Vérifier s'il y a des réservations pour cette activité
    const reservationsCount = await prisma.reservation.count({
      where: {
        eventId,
        activityName: existingActivity.name,
      },
    });

    if (reservationsCount > 0) {
      return new Response(
        JSON.stringify({
          error: 'Impossible de supprimer une activité avec des réservations',
          reservationsCount,
        }),
        { status: 400 }
      );
    }

    // 5. Supprimer l'activité (cascade : pricing)
    await prisma.activity.delete({
      where: { id: activityId },
    });

    // 6. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Activité supprimée avec succès',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

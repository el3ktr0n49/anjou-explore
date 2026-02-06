// Force SSR : Route API avec paramètre dynamique [id]
export const prerender = false;

/**
 * API Routes pour la gestion d'un événement spécifique
 *
 * GET /api/admin/events/[id]
 * - Récupère les détails complets d'un événement (avec activités et tarifs)
 *
 * PUT /api/admin/events/[id]
 * - Met à jour un événement (infos générales uniquement, pas les activités)
 *
 * DELETE /api/admin/events/[id]
 * - Supprime un événement (cascade : activities + pricing)
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { requireAuth } from '../../../../lib/auth/middleware';

// ═══════════════════════════════════════════════════════════
// GET - Récupérer un événement
// ═══════════════════════════════════════════════════════════

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

    // 2. Récupérer l'ID depuis les params
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Récupérer l'événement avec toutes ses relations
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        activities: {
          include: {
            pricing: {
              orderBy: {
                priceType: 'asc',
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
        reservations: {
          where: {
            archived: false,
          },
          select: {
            id: true,
            participants: true,
            activityName: true,
            paymentStatus: true,
            amount: true,
          },
        },
      },
    });

    if (!event) {
      return new Response(
        JSON.stringify({
          error: 'Événement non trouvé',
        }),
        { status: 404 }
      );
    }

    // 4. Calculer les stats par activité
    const activitiesWithStats = event.activities.map((activity) => {
      // Compter les participants par activité
      const activityReservations = event.reservations.filter(
        (r) => r.activityName === activity.name
      );

      let totalParticipants = 0;
      let totalRevenue = 0;

      activityReservations.forEach((reservation) => {
        const participants = reservation.participants as Record<string, number>;
        const count = Object.values(participants).reduce((sum, qty) => sum + qty, 0);
        totalParticipants += count;

        if (reservation.paymentStatus === 'PAID') {
          totalRevenue += Number(reservation.amount);
        }
      });

      return {
        ...activity,
        stats: {
          totalParticipants,
          placesRestantes: activity.maxParticipants
            ? activity.maxParticipants - totalParticipants
            : null,
          totalRevenue,
          reservationsCount: activityReservations.length,
        },
      };
    });

    // 5. Retourner l'événement avec stats
    return new Response(
      JSON.stringify({
        event: {
          ...event,
          activities: activitiesWithStats,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// ═══════════════════════════════════════════════════════════
// PUT - Mettre à jour un événement (infos générales)
// ═══════════════════════════════════════════════════════════

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
  paymentEnabled: z.boolean().optional(),
  registrationDeadline: z.string().datetime().optional().nullable(),
  registrationOpenOverride: z.boolean().optional().nullable(),
  location: z.string().optional().nullable(),
  partnerLogo: z.string().optional().nullable(),
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

    // 2. Récupérer l'ID depuis les params
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Parser et valider le body
    const body = await context.request.json();
    const validationResult = updateEventSchema.safeParse(body);

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

    // 4. Vérifier que l'événement existe
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return new Response(
        JSON.stringify({
          error: 'Événement non trouvé',
        }),
        { status: 404 }
      );
    }

    // 5. Mettre à jour l'événement
    const updatedData: any = {};
    if (data.name !== undefined) updatedData.name = data.name;
    if (data.slug !== undefined) updatedData.slug = data.slug;
    if (data.description !== undefined) updatedData.description = data.description;
    if (data.date !== undefined) updatedData.date = new Date(data.date);
    if (data.status !== undefined) updatedData.status = data.status;
    if (data.paymentEnabled !== undefined) updatedData.paymentEnabled = data.paymentEnabled;
    if (data.registrationDeadline !== undefined) {
      updatedData.registrationDeadline = data.registrationDeadline
        ? new Date(data.registrationDeadline)
        : null;
    }
    if (data.registrationOpenOverride !== undefined) {
      updatedData.registrationOpenOverride = data.registrationOpenOverride;
    }
    if (data.location !== undefined) updatedData.location = data.location;
    if (data.partnerLogo !== undefined) updatedData.partnerLogo = data.partnerLogo;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updatedData,
      include: {
        activities: {
          include: {
            pricing: true,
          },
        },
      },
    });

    // 6. Retourner l'événement mis à jour
    return new Response(
      JSON.stringify({
        success: true,
        event: updatedEvent,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE - Supprimer un événement
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

    // 2. Récupérer l'ID depuis les params
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'ID manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que l'événement existe
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        reservations: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingEvent) {
      return new Response(
        JSON.stringify({
          error: 'Événement non trouvé',
        }),
        { status: 404 }
      );
    }

    // 4. Avertir si des réservations existent
    if (existingEvent.reservations.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Impossible de supprimer un événement avec des réservations',
          reservationsCount: existingEvent.reservations.length,
        }),
        { status: 400 }
      );
    }

    // 5. Supprimer l'événement (cascade : activities + pricing)
    await prisma.event.delete({
      where: { id },
    });

    // 6. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Événement supprimé avec succès',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

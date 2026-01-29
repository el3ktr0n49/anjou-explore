/**
 * POST /api/admin/events/[id]/activities
 * Créer une activité pour un événement
 *
 * Body:
 * {
 *   name: string,
 *   description?: string,
 *   maxParticipants?: number
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../../lib/db/client';
import { requireAuth } from '../../../../../lib/auth/middleware';

// Schema de validation pour la création d'activité
const createActivitySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
  maxParticipants: z.number().int().positive().optional().nullable(),
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

    // 2. Récupérer l'ID de l'événement
    const { id: eventId } = context.params;
    if (!eventId) {
      return new Response(
        JSON.stringify({
          error: 'ID événement manquant',
        }),
        { status: 400 }
      );
    }

    // 3. Vérifier que l'événement existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return new Response(
        JSON.stringify({
          error: 'Événement non trouvé',
        }),
        { status: 404 }
      );
    }

    // 4. Parser et valider le body
    const body = await context.request.json();
    const validationResult = createActivitySchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { name, description, maxParticipants } = validationResult.data;

    // 5. Vérifier que l'activité n'existe pas déjà pour cet événement
    const existingActivity = await prisma.activity.findUnique({
      where: {
        eventId_name: {
          eventId,
          name,
        },
      },
    });

    if (existingActivity) {
      return new Response(
        JSON.stringify({
          error: 'Une activité avec ce nom existe déjà pour cet événement',
        }),
        { status: 409 }
      );
    }

    // 6. Créer l'activité
    const activity = await prisma.activity.create({
      data: {
        eventId,
        name,
        description: description || null,
        maxParticipants: maxParticipants || null,
      },
    });

    // 7. Retourner l'activité créée
    return new Response(
      JSON.stringify({
        success: true,
        activity,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

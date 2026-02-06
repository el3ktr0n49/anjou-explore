// Force SSR : Route API protégée qui accède à request.headers
export const prerender = false;

/**
 * API Routes pour la gestion des événements
 *
 * GET /api/admin/events
 * - Liste tous les événements avec filtres optionnels
 *
 * POST /api/admin/events
 * - Créer un nouvel événement
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { requireAuth } from '../../../../lib/auth/middleware';

// ═══════════════════════════════════════════════════════════
// GET - Liste des événements
// ═══════════════════════════════════════════════════════════

// Schema de validation pour les query params
const querySchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
});

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

    // 2. Parser et valider les query params
    const url = new URL(context.request.url);
    const queryParams = {
      status: url.searchParams.get('status') || undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Paramètres invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // 3. Construire le filtre Prisma
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // 4. Récupérer les événements avec tri par date (plus récents en premier)
    // + inclure les activités et leur tarification
    const events = await prisma.event.findMany({
      where,
      include: {
        activities: {
          include: {
            pricing: {
              orderBy: {
                priceType: 'asc', // adulte avant enfant
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            reservations: true,
          },
        },
      },
      orderBy: {
        date: 'desc', // Événements les plus récents en premier
      },
    });

    // 5. Compter le total
    const total = await prisma.event.count({ where });

    // 6. Retourner les résultats
    return new Response(
      JSON.stringify({
        events,
        total,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

// ═══════════════════════════════════════════════════════════
// POST - Créer un événement
// ═══════════════════════════════════════════════════════════

const createEventSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  slug: z.string().min(1, 'Le slug est requis'),
  description: z.string().optional().nullable(),
  date: z.string().datetime('Date invalide'),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  paymentEnabled: z.boolean().default(false),
  registrationDeadline: z.string().datetime().optional().nullable(),
  registrationOpenOverride: z.boolean().optional().nullable(),
  location: z.string().optional().nullable(),
  partnerLogo: z.string().optional().nullable(),
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

    // 2. Parser et valider le body
    const body = await context.request.json();
    const validationResult = createEventSchema.safeParse(body);

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

    // 3. Vérifier que le slug n'existe pas déjà
    const existingEvent = await prisma.event.findUnique({
      where: { slug: data.slug },
    });

    if (existingEvent) {
      return new Response(
        JSON.stringify({
          error: 'Un événement avec ce slug existe déjà',
        }),
        { status: 409 }
      );
    }

    // 4. Créer l'événement
    const event = await prisma.event.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        date: new Date(data.date),
        status: data.status,
        paymentEnabled: data.paymentEnabled,
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline)
          : null,
        registrationOpenOverride: data.registrationOpenOverride ?? null,
        location: data.location || null,
        partnerLogo: data.partnerLogo || null,
      },
    });

    // 5. Retourner l'événement créé
    return new Response(
      JSON.stringify({
        success: true,
        event,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

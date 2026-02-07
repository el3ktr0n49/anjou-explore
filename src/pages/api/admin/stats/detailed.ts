// Force SSR : Route API protégée qui accède à request.headers
export const prerender = false;

/**
 * GET /api/admin/stats/detailed
 *
 * Statistiques détaillées pour la page /admin/stats
 *
 * Sans paramètres : retourne KPIs globaux (revenus année en cours) + liste événements
 * Avec ?eventId=uuid : retourne stats détaillées pour un événement
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { requireAuth } from '../../../../lib/auth/middleware';

const querySchema = z.object({
  eventId: z.string().uuid().optional(),
});

export const GET: APIRoute = async (context) => {
  try {
    // 1. Vérifier l'authentification
    const admin = await requireAuth(context);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    // 2. Parser les query params
    const url = new URL(context.request.url);
    const parsed = querySchema.safeParse({
      eventId: url.searchParams.get('eventId') || undefined,
    });

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides' }), { status: 400 });
    }

    const { eventId } = parsed.data;

    // 3. Route vers global ou per-event
    if (eventId) {
      return await getEventStats(eventId);
    } else {
      return await getGlobalStats();
    }
  } catch (error) {
    console.error('Erreur stats détaillées:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
};

// ═══════════════════════════════════════════════════════════
// Stats globales (KPIs financiers année en cours + liste événements)
// ═══════════════════════════════════════════════════════════

async function getGlobalStats() {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const yearFilter = {
    createdAt: { gte: yearStart, lt: yearEnd },
    archived: false,
  };

  const [revenuePaid, revenuePending, totalReservations, totalPaid, contactsNew, events] =
    await Promise.all([
      prisma.reservation.aggregate({
        _sum: { amount: true },
        where: { ...yearFilter, paymentStatus: 'PAID' },
      }),
      prisma.reservation.aggregate({
        _sum: { amount: true },
        where: { ...yearFilter, paymentStatus: 'PENDING' },
      }),
      prisma.reservation.count({ where: yearFilter }),
      prisma.reservation.count({ where: { ...yearFilter, paymentStatus: 'PAID' } }),
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
      prisma.event.findMany({
        select: { id: true, name: true, slug: true, date: true, status: true },
        orderBy: { date: 'desc' },
      }),
    ]);

  const conversionRate = totalReservations > 0 ? (totalPaid / totalReservations) * 100 : 0;

  return new Response(
    JSON.stringify({
      global: {
        revenuePaid: revenuePaid._sum.amount ? Number(revenuePaid._sum.amount) : 0,
        revenuePending: revenuePending._sum.amount ? Number(revenuePending._sum.amount) : 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        contactsNew,
      },
      events,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════
// Stats par événement
// ═══════════════════════════════════════════════════════════

async function getEventStats(eventId: string) {
  // Récupérer l'événement avec activités et réservations
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      slug: true,
      date: true,
      status: true,
      activities: {
        select: {
          id: true,
          name: true,
          maxParticipants: true,
        },
        orderBy: { name: 'asc' },
      },
      reservations: {
        where: { archived: false },
        select: {
          id: true,
          activityName: true,
          activityId: true,
          participants: true,
          amount: true,
          paymentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!event) {
    return new Response(JSON.stringify({ error: 'Événement non trouvé' }), { status: 404 });
  }

  // --- KPIs ---
  let totalParticipants = 0;
  let revenuePaid = 0;
  let revenuePending = 0;
  let totalMaxParticipants = 0;
  let hasMaxParticipants = false;

  // --- Payment distribution ---
  const paymentDistribution: Record<string, number> = {
    PENDING: 0,
    PAID: 0,
    FAILED: 0,
    REFUNDED: 0,
    CANCELLED: 0,
  };

  // --- Activities breakdown ---
  const activityMap = new Map<
    string,
    {
      activityId: string;
      activityName: string;
      maxParticipants: number | null;
      totalParticipants: number;
      participantsByType: Record<string, number>;
      reservationsCount: number;
      revenuePaid: number;
      revenuePending: number;
    }
  >();

  // Initialiser avec toutes les activités (même celles sans réservation)
  for (const activity of event.activities) {
    activityMap.set(activity.name, {
      activityId: activity.id,
      activityName: activity.name,
      maxParticipants: activity.maxParticipants,
      totalParticipants: 0,
      participantsByType: {},
      reservationsCount: 0,
      revenuePaid: 0,
      revenuePending: 0,
    });

    if (activity.maxParticipants !== null) {
      totalMaxParticipants += activity.maxParticipants;
      hasMaxParticipants = true;
    }
  }

  // --- Timeline ---
  const timelineMap = new Map<string, number>();

  // Traiter chaque réservation
  for (const reservation of event.reservations) {
    const participants = reservation.participants as Record<string, number>;
    const participantCount = Object.values(participants).reduce((sum, qty) => sum + qty, 0);
    const amount = Number(reservation.amount);

    // KPIs globaux
    totalParticipants += participantCount;
    if (reservation.paymentStatus === 'PAID') revenuePaid += amount;
    if (reservation.paymentStatus === 'PENDING') revenuePending += amount;

    // Payment distribution
    const status = reservation.paymentStatus;
    if (status in paymentDistribution) {
      paymentDistribution[status]++;
    }

    // Activity breakdown
    const activityData = activityMap.get(reservation.activityName);
    if (activityData) {
      activityData.totalParticipants += participantCount;
      activityData.reservationsCount++;
      if (reservation.paymentStatus === 'PAID') activityData.revenuePaid += amount;
      if (reservation.paymentStatus === 'PENDING') activityData.revenuePending += amount;

      // Agrégation par type de participant
      for (const [type, qty] of Object.entries(participants)) {
        activityData.participantsByType[type] = (activityData.participantsByType[type] || 0) + qty;
      }
    }

    // Timeline (grouper par jour)
    const day = reservation.createdAt.toISOString().split('T')[0];
    timelineMap.set(day, (timelineMap.get(day) || 0) + 1);
  }

  // Construire la timeline avec dates continues et cumul
  const inscriptionsTimeline = buildTimeline(timelineMap);

  // Fill rate
  const fillRate = hasMaxParticipants
    ? Math.round((totalParticipants / totalMaxParticipants) * 1000) / 10
    : null;

  return new Response(
    JSON.stringify({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        date: event.date,
        status: event.status,
      },
      kpis: {
        totalParticipants,
        totalReservations: event.reservations.length,
        revenuePaid: Math.round(revenuePaid * 100) / 100,
        revenuePending: Math.round(revenuePending * 100) / 100,
        fillRate,
      },
      activitiesBreakdown: Array.from(activityMap.values()),
      paymentDistribution,
      inscriptionsTimeline,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Construit une timeline continue (tous les jours entre premier et dernier)
 * avec compteur cumulatif
 */
function buildTimeline(
  timelineMap: Map<string, number>
): Array<{ date: string; count: number; cumulativeCount: number }> {
  if (timelineMap.size === 0) return [];

  const sortedDates = Array.from(timelineMap.keys()).sort();
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);

  const timeline: Array<{ date: string; count: number; cumulativeCount: number }> = [];
  let cumulative = 0;
  const current = new Date(firstDate);

  while (current <= lastDate) {
    const dayStr = current.toISOString().split('T')[0];
    const count = timelineMap.get(dayStr) || 0;
    cumulative += count;

    timeline.push({ date: dayStr, count, cumulativeCount: cumulative });

    current.setDate(current.getDate() + 1);
  }

  return timeline;
}

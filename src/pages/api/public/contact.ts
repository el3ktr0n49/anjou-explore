// Force SSR : Route API
export const prerender = false;

/**
 * POST /api/public/contact
 * Soumettre une demande de contact ou réservation aventure
 *
 * Body:
 * {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   message: string,
 *   isBooking: boolean,
 *   bookingData?: {
 *     participants?: number,
 *     duration?: string,
 *     formula?: string
 *   }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   contactId: string
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../lib/db/client';

// Schema de validation pour les données de réservation
const bookingDataSchema = z.object({
  participants: z.number().int().positive().optional(),
  duration: z.enum(['1jour', '2jours']).optional(),
  formula: z.enum(['all-inclusive', 'adventure', 'adventure-plus', 'race']).optional(),
});

// Schema de validation pour le formulaire complet
const contactSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255),
  email: z.string().email('Email invalide').max(255),
  phone: z.string().min(1, 'Le téléphone est requis').max(50),
  message: z.string().min(1, 'Le message est requis'),
  isBooking: z.boolean().default(false),
  bookingData: bookingDataSchema.optional(),
});

export const POST: APIRoute = async (context) => {
  try {
    // 1. Parser et valider le body
    const body = await context.request.json();
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { name, email, phone, message, isBooking, bookingData } = validationResult.data;

    // 2. Valider que si isBooking = true, bookingData est présent et complet
    if (isBooking) {
      if (
        !bookingData ||
        !bookingData.participants ||
        !bookingData.duration ||
        !bookingData.formula
      ) {
        return new Response(
          JSON.stringify({
            error: 'Données de réservation incomplètes',
            message:
              'Pour une réservation, vous devez renseigner le nombre de participants, la durée et la formule.',
          }),
          { status: 400 }
        );
      }
    }

    // 3. Créer la demande de contact en base
    const contactRequest = await prisma.contactRequest.create({
      data: {
        nom: name,
        email,
        telephone: phone,
        message,
        isBooking,
        bookingData: isBooking ? bookingData : null,
        status: 'NEW',
      },
    });

    // 4. Retourner le succès avec l'ID
    return new Response(
      JSON.stringify({
        success: true,
        contactId: contactRequest.id,
        message: isBooking
          ? 'Votre demande de réservation a été envoyée avec succès.'
          : 'Votre message a été envoyé avec succès.',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création de la demande de contact:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        message: "Une erreur s'est produite lors de l'envoi de votre demande.",
      }),
      { status: 500 }
    );
  }
};

/**
 * PUT /api/admin/contacts/[id]
 * Mettre à jour le statut d'une demande de contact
 *
 * Body:
 * {
 *   status: "NEW" | "PROCESSED" | "ARCHIVED",
 *   processedBy?: string  // Nom de l'admin qui traite
 * }
 *
 * DELETE /api/admin/contacts/[id]
 * Archiver définitivement une demande de contact
 */

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { prisma } from '../../../../lib/db/client';
import { requireAuth } from '../../../../lib/auth/middleware';

// Schema de validation pour le body PUT
const updateSchema = z.object({
  status: z.enum(['NEW', 'PROCESSED', 'ARCHIVED']),
  processedBy: z.string().optional(),
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
    const validationResult = updateSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Données invalides',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { status, processedBy } = validationResult.data;

    // 4. Vérifier que le contact existe
    const existingContact = await prisma.contactRequest.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return new Response(
        JSON.stringify({
          error: 'Contact non trouvé',
        }),
        { status: 404 }
      );
    }

    // 5. Mettre à jour le contact
    const updatedContact = await prisma.contactRequest.update({
      where: { id },
      data: {
        status,
        processedBy: processedBy || admin.adminName,
        processedAt: status === 'PROCESSED' ? new Date() : existingContact.processedAt,
      },
    });

    // 6. Retourner le contact mis à jour
    return new Response(
      JSON.stringify({
        success: true,
        contact: updatedContact,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour du contact:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

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

    // 3. Vérifier que le contact existe
    const existingContact = await prisma.contactRequest.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return new Response(
        JSON.stringify({
          error: 'Contact non trouvé',
        }),
        { status: 404 }
      );
    }

    // 4. Supprimer le contact (ou archiver définitivement)
    await prisma.contactRequest.delete({
      where: { id },
    });

    // 5. Retourner succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact supprimé avec succès',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du contact:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
      }),
      { status: 500 }
    );
  }
};

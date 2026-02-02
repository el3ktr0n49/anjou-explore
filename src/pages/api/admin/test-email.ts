/**
 * GET /api/admin/test-email
 *
 * Endpoint de test pour diagnostiquer l'envoi d'emails via Resend.
 * Protégé par authentification admin.
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware';
import { Resend } from 'resend';
import 'dotenv/config';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'anjouexplore@gmail.com';

// ============================================================================
// HANDLER
// ============================================================================

export const GET: APIRoute = async (context) => {
  // 1. Vérifier l'authentification
  const admin = await requireAuth(context);
  if (!admin) {
    return new Response(
      JSON.stringify({ error: 'Non authentifié' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Vérifier la configuration
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'RESEND_API_KEY manquante dans .env',
        config: {
          resendApiKey: '❌ Non définie',
          emailFrom: EMAIL_FROM,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Tester l'envoi d'un email
  try {
    const resend = new Resend(RESEND_API_KEY);

    console.log('[Test Email] Envoi d\'un email de test...');
    console.log('[Test Email] From:', EMAIL_FROM);
    console.log('[Test Email] API Key:', RESEND_API_KEY.substring(0, 10) + '...');

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: 'adrienlem2@gmail.com', // Email de test (admin)
      subject: 'Test Email - Anjou Explore',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #c4a571;">🧪 Email de test - Anjou Explore</h1>
            <p>Cet email est un test pour vérifier que Resend fonctionne correctement.</p>
            <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Envoyé depuis l'endpoint /api/admin/test-email
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Test Email] Erreur Resend:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur lors de l\'envoi via Resend',
          details: error,
          config: {
            resendApiKey: '✅ Définie',
            emailFrom: EMAIL_FROM,
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Test Email] Email envoyé avec succès:', data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de test envoyé avec succès',
        emailId: data?.id,
        config: {
          resendApiKey: '✅ Définie',
          emailFrom: EMAIL_FROM,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Test Email] Erreur lors de l\'envoi:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Exception lors de l\'envoi',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          resendApiKey: RESEND_API_KEY ? '✅ Définie' : '❌ Non définie',
          emailFrom: EMAIL_FROM,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

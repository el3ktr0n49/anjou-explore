/**
 * Email Templates - Resend Service
 *
 * Templates d'emails pour notifications utilisateur.
 * Documentation Resend: https://resend.com/docs
 */

import { Resend } from 'resend';
import 'dotenv/config';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'anjouexplore@gmail.com';

if (!RESEND_API_KEY) {
  console.warn('[Email] RESEND_API_KEY manquante - emails désactivés');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentConfirmationData {
  to: string;
  reservation: {
    id: string;
    nom: string;
    prenom: string;
    eventName: string;
    eventDate: Date;
    activityName: string;
    participants: Record<string, number>;
    amount: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate une date en français
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate un montant en euros
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate les participants (ex: "2 adultes, 1 enfant")
 */
function formatParticipants(participants: Record<string, number>): string {
  const parts: string[] = [];
  for (const [type, count] of Object.entries(participants)) {
    if (count > 0) {
      parts.push(`${count} ${type}${count > 1 ? 's' : ''}`);
    }
  }
  return parts.join(', ');
}

// ============================================================================
// TEMPLATES HTML
// ============================================================================

/**
 * Template email de confirmation de paiement
 */
function paymentConfirmationTemplate(data: PaymentConfirmationData['reservation']): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de réservation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f1e8;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #c4a571 0%, #6b7456 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .success-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f9fafb;
      border-left: 4px solid #c4a571;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #4a3b2f;
    }
    .info-value {
      color: #666;
    }
    .amount {
      background: linear-gradient(135deg, #c4a571 0%, #6b7456 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px;
      margin: 30px 0;
    }
    .amount .label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .amount .value {
      font-size: 36px;
      font-weight: 700;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #c4a571;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .contact-info {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Réservation confirmée !</h1>
    </div>

    <div class="content">
      <div class="success-badge">✓ Paiement reçu</div>

      <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>

      <p>Nous sommes ravis de confirmer votre réservation pour <strong>${data.eventName}</strong> !</p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Événement</span>
          <span class="info-value">${data.eventName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${formatDate(data.eventDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Activité</span>
          <span class="info-value">${data.activityName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Participants</span>
          <span class="info-value">${formatParticipants(data.participants)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Référence</span>
          <span class="info-value">#${data.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div class="amount">
        <div class="label">Montant payé</div>
        <div class="value">${formatAmount(data.amount)}</div>
      </div>

      <p>Vous recevrez plus d'informations sur l'événement dans les prochains jours.</p>

      <p>En attendant, n'hésitez pas à nous contacter si vous avez des questions !</p>

      <div class="contact-info">
        <p><strong>Contact :</strong></p>
        <p>
          📞 06.83.92.45.03<br>
          📧 anjouexplore@gmail.com<br>
          🌐 <a href="http://localhost:4321" style="color: #c4a571;">www.anjouexplore.com</a>
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Merci de votre confiance !</p>
      <p><strong>L'équipe Anjou Explore</strong></p>
      <p style="font-size: 12px; margin-top: 20px; color: #999;">
        Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// FONCTIONS D'ENVOI
// ============================================================================

/**
 * Envoie un email de confirmation de paiement
 */
export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationData
): Promise<void> {
  if (!resend) {
    console.warn('[Email] Resend non configuré - email non envoyé');
    return;
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.to,
      subject: `Confirmation de réservation - ${data.reservation.eventName}`,
      html: paymentConfirmationTemplate(data.reservation),
    });

    if (error) {
      console.error('[Email] Erreur Resend:', error);
      throw new Error(`Erreur envoi email: ${error.message}`);
    }

    console.log('[Email] Email de confirmation envoyé:', result?.id);
  } catch (error) {
    console.error('[Email] Erreur envoi email:', error);
    throw error;
  }
}

/**
 * Envoie un email d'échec de paiement (optionnel)
 */
export async function sendPaymentFailedEmail(
  to: string,
  reservationData: {
    prenom: string;
    nom: string;
    eventName: string;
  }
): Promise<void> {
  if (!resend) {
    console.warn('[Email] Resend non configuré - email non envoyé');
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Problème avec votre paiement',
      html: `
        <p>Bonjour ${reservationData.prenom} ${reservationData.nom},</p>
        <p>Nous avons rencontré un problème lors du traitement de votre paiement pour ${reservationData.eventName}.</p>
        <p>Veuillez réessayer ou nous contacter directement : 06.83.92.45.03</p>
        <p>L'équipe Anjou Explore</p>
      `,
    });

    console.log('[Email] Email d\'échec envoyé');
  } catch (error) {
    console.error('[Email] Erreur envoi email d\'échec:', error);
    throw error;
  }
}

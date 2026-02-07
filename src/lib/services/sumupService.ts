/**
 * SumUp Payment Service
 *
 * Service pour gérer les paiements via l'API SumUp.
 * Documentation: https://developer.sumup.com
 */

import 'dotenv/config';

// ============================================================================
// TYPES
// ============================================================================

export interface SumUpCheckoutRequest {
  amount: number;           // Montant en euros (ex: 45.00)
  currency: string;         // Code devise ISO (ex: "EUR")
  checkoutReference: string; // Référence unique (ex: reservationId)
  description: string;      // Description visible par l'utilisateur
  redirectUrl: string;      // URL de redirection navigateur après paiement
  returnUrl: string;        // URL webhook (SumUp POST le statut du paiement)
}

export interface SumUpCheckoutResponse {
  id: string;               // ID du checkout (à stocker en BDD)
  hostedCheckoutUrl: string; // URL vers laquelle rediriger l'utilisateur
  status: SumUpCheckoutStatus;
  amount: number;
  currency: string;
  checkoutReference: string;
  date: string;
}

export type SumUpCheckoutStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface SumUpCheckoutDetails {
  id: string;
  status: SumUpCheckoutStatus;
  amount: number;
  currency: string;
  checkoutReference: string;
  description: string;
  date: string;
  transactionId?: string; // ID de la transaction si paiement réussi
  transactions?: Array<{
    id: string;
    status: string;
    amount: number;
    timestamp: string;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SUMUP_PAY_TO_EMAIL = process.env.SUMUP_PAY_TO_EMAIL || 'anjouexplore@gmail.com';
const SUMUP_BASE_URL = 'https://api.sumup.com/v0.1';

/**
 * Valide la configuration SumUp au runtime (lazy)
 * @throws {Error} Si SUMUP_API_KEY manquante
 */
function validateConfig(): void {
  if (!SUMUP_API_KEY) {
    throw new Error('SUMUP_API_KEY manquante dans les variables d\'environnement');
  }

  // Priorité : merchant_code > pay_to_email
  if (!SUMUP_MERCHANT_CODE && !SUMUP_PAY_TO_EMAIL) {
    throw new Error('SUMUP_MERCHANT_CODE ou SUMUP_PAY_TO_EMAIL requis');
  }
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Crée un checkout SumUp et retourne l'URL de paiement hébergée
 */
export async function createCheckout(request: SumUpCheckoutRequest): Promise<SumUpCheckoutResponse> {
  try {
    // Valider la config au runtime (pas au build)
    validateConfig();

    // Log pour debug
    console.log('[SumUp] Création checkout avec:', SUMUP_MERCHANT_CODE
      ? `merchant_code=${SUMUP_MERCHANT_CODE}`
      : `pay_to_email=${SUMUP_PAY_TO_EMAIL}`);

    const response = await fetch(`${SUMUP_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        checkout_reference: request.checkoutReference,
        description: request.description,
        // Priorité : merchant_code > pay_to_email
        ...(SUMUP_MERCHANT_CODE
          ? { merchant_code: SUMUP_MERCHANT_CODE }
          : { pay_to_email: SUMUP_PAY_TO_EMAIL }),
        redirect_url: request.redirectUrl,
        return_url: request.returnUrl,
        hosted_checkout: {
          enabled: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SumUp API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    // Vérifier que la response contient l'URL de checkout
    if (!data.id || !data.hosted_checkout_url) {
      throw new Error('Response SumUp invalide: manque id ou hosted_checkout_url');
    }

    return {
      id: data.id,
      hostedCheckoutUrl: data.hosted_checkout_url,
      status: data.status || 'PENDING',
      amount: data.amount,
      currency: data.currency,
      checkoutReference: data.checkout_reference,
      date: data.date || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SumUp] Erreur création checkout:', error);
    throw error;
  }
}

/**
 * Récupère les détails d'un checkout SumUp (pour vérifier le statut)
 */
export async function getCheckout(checkoutId: string): Promise<SumUpCheckoutDetails> {
  try {
    // Valider la config au runtime (pas au build)
    validateConfig();

    const response = await fetch(`${SUMUP_BASE_URL}/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SumUp API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      checkoutReference: data.checkout_reference,
      description: data.description,
      date: data.date,
      transactionId: data.transaction_id,
      transactions: data.transactions,
    };
  } catch (error) {
    console.error('[SumUp] Erreur récupération checkout:', error);
    throw error;
  }
}

/**
 * Vérifie si un checkout est payé avec succès
 */
export async function isCheckoutPaid(checkoutId: string): Promise<boolean> {
  try {
    const checkout = await getCheckout(checkoutId);
    return checkout.status === 'PAID';
  } catch (error) {
    console.error('[SumUp] Erreur vérification paiement:', error);
    return false;
  }
}

/**
 * Récupère l'ID de transaction d'un checkout payé
 */
export async function getTransactionId(checkoutId: string): Promise<string | null> {
  try {
    const checkout = await getCheckout(checkoutId);
    return checkout.transactionId || null;
  } catch (error) {
    console.error('[SumUp] Erreur récupération transactionId:', error);
    return null;
  }
}

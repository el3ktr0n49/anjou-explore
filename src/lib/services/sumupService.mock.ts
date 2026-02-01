/**
 * SumUp Payment Service - MOCK VERSION (pour développement)
 *
 * Version de simulation pour tester le workflow sans compte SumUp valide
 */

import type { SumUpCheckoutRequest, SumUpCheckoutResponse, SumUpCheckoutDetails, SumUpCheckoutStatus } from './sumupService';

// Simuler un délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock de createCheckout
 * Simule la création d'un checkout SumUp
 */
export async function createCheckout(request: SumUpCheckoutRequest): Promise<SumUpCheckoutResponse> {
  await delay(500); // Simuler un appel réseau

  const checkoutId = `mock_checkout_${Date.now()}`;

  // Générer une URL de checkout simulée qui redirige directement vers la page de retour
  // En simulation, on passe directement à "payé"
  const appUrl = process.env.APP_URL || 'http://localhost:4321';
  const hostedCheckoutUrl = `${appUrl}/payment/mock-checkout?reservationId=${request.checkoutReference}&amount=${request.amount}`;

  console.log('[SumUp MOCK] Checkout créé:', {
    checkoutId,
    amount: request.amount,
    currency: request.currency,
    reference: request.checkoutReference,
  });

  return {
    id: checkoutId,
    hostedCheckoutUrl,
    status: 'PENDING',
    amount: request.amount,
    currency: request.currency,
    checkoutReference: request.checkoutReference,
    date: new Date().toISOString(),
  };
}

/**
 * Mock de getCheckout
 * Simule la récupération d'un checkout
 */
export async function getCheckout(checkoutId: string): Promise<SumUpCheckoutDetails> {
  await delay(300);

  // En mode mock, on considère tous les checkouts comme payés après 2 secondes
  const isPaid = true;

  console.log('[SumUp MOCK] Récupération checkout:', checkoutId, isPaid ? 'PAID' : 'PENDING');

  return {
    id: checkoutId,
    status: isPaid ? 'PAID' : 'PENDING',
    amount: 45.00,
    currency: 'EUR',
    checkoutReference: 'mock-ref',
    description: 'Mock checkout',
    date: new Date().toISOString(),
    transactionId: isPaid ? `mock_tx_${Date.now()}` : undefined,
    transactions: isPaid ? [
      {
        id: `mock_tx_${Date.now()}`,
        status: 'SUCCESSFUL',
        amount: 45.00,
        timestamp: new Date().toISOString(),
      }
    ] : [],
  };
}

/**
 * Mock de isCheckoutPaid
 */
export async function isCheckoutPaid(checkoutId: string): Promise<boolean> {
  const checkout = await getCheckout(checkoutId);
  return checkout.status === 'PAID';
}

/**
 * Mock de getTransactionId
 */
export async function getTransactionId(checkoutId: string): Promise<string | null> {
  const checkout = await getCheckout(checkoutId);
  return checkout.transactionId || null;
}

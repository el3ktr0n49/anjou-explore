/**
 * Script TypeScript pour le formulaire d'inscription événement
 * - Calcul total en temps réel
 * - Soumission du formulaire vers l'API
 * - Affichage des messages de succès/erreur
 */

// ═══════════════════════════════════════════════════════════
// Types & State
// ═══════════════════════════════════════════════════════════

interface PricingItem {
  pricingId: string;
  activityId: string;
  price: number;
  quantity: number;
}

// Get eventSlug from global (set in the Astro page)
declare global {
  interface Window {
    eventSlug: string;
  }
}

// ═══════════════════════════════════════════════════════════
// DOM Elements
// ═══════════════════════════════════════════════════════════

const form = document.getElementById('inscription-form') as HTMLFormElement;
const totalAmountEl = document.getElementById('total-amount') as HTMLElement;
const participantsSummaryEl = document.getElementById('participants-summary') as HTMLElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const submitText = document.getElementById('submit-text') as HTMLElement;
const formMessage = document.getElementById('form-message') as HTMLElement;

// ═══════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════

function getAllQuantityInputs(): NodeListOf<HTMLInputElement> {
  return document.querySelectorAll('.quantity-input');
}

function calculateTotal(): { total: number; items: PricingItem[]; totalParticipants: number } {
  const inputs = getAllQuantityInputs();
  let total = 0;
  const items: PricingItem[] = [];
  let totalParticipants = 0;

  inputs.forEach((input) => {
    // Skip disabled inputs (full activities)
    if (input.disabled) {
      return;
    }

    const quantity = parseInt(input.value) || 0;

    if (quantity > 0) {
      const pricingId = input.dataset.pricingId!;
      const activityId = input.dataset.activityId!;
      const price = parseFloat(input.dataset.price!);

      total += price * quantity;
      totalParticipants += quantity;

      items.push({
        pricingId,
        activityId,
        price,
        quantity,
      });
    }
  });

  return { total, items, totalParticipants };
}

function updateTotal() {
  const { total, totalParticipants } = calculateTotal();

  // Update total amount
  totalAmountEl.textContent = `${total.toFixed(2)}€`;

  // Update participants summary
  if (totalParticipants === 0) {
    participantsSummaryEl.textContent = 'Aucun participant sélectionné';
    submitBtn.disabled = true;
  } else {
    participantsSummaryEl.textContent =
      totalParticipants === 1
        ? '1 participant sélectionné'
        : `${totalParticipants} participants sélectionnés`;
    submitBtn.disabled = false;
  }
}

function showMessage(message: string, type: 'success' | 'error') {
  formMessage.classList.remove('hidden', 'form-message-success', 'form-message-error');
  formMessage.classList.add(`form-message-${type}`);
  formMessage.textContent = message;

  // Scroll to message with offset for fixed menu
  scrollToElementWithOffset(formMessage);

  // Auto-hide after 10 seconds for errors, keep success messages
  if (type === 'error') {
    setTimeout(() => {
      formMessage.classList.add('hidden');
    }, 10000);
  }
}

function scrollToElementWithOffset(element: HTMLElement, offset = 100) {
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

function hideMessage() {
  formMessage.classList.add('hidden');
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  hideMessage();

  const { items, totalParticipants } = calculateTotal();

  // Validation côté client
  if (totalParticipants === 0) {
    showMessage('Veuillez sélectionner au moins un participant', 'error');
    return;
  }

  // Get form data
  const formData = new FormData(form);
  const nom = formData.get('nom') as string;
  const prenom = formData.get('prenom') as string;
  const email = formData.get('email') as string;
  const telephone = formData.get('telephone') as string;

  // Validate required fields
  if (!nom || !prenom || !email || !telephone) {
    showMessage('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  submitText.textContent = 'Envoi en cours...';

  try {
    // Build request body
    const body = {
      eventSlug: window.eventSlug,
      nom,
      prenom,
      email,
      telephone,
      items: items.map((item) => ({
        eventPricingId: item.pricingId,
        quantity: item.quantity,
      })),
    };

    // Send to API
    const response = await fetch('/api/public/reservations/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle API errors
      if (data.details) {
        // Capacity error or validation error
        const errorMessage =
          data.error +
          (data.details.available !== undefined
            ? ` (${data.details.available} place(s) disponible(s))`
            : '');
        showMessage(errorMessage, 'error');
      } else {
        showMessage(data.error || 'Erreur lors de la réservation', 'error');
      }
      return;
    }

    // Success! Reservation created, now initialize payment
    showMessage(
      `✅ Réservation créée ! Redirection vers le paiement sécurisé...`,
      'success'
    );

    // Wait 1 second to let user see the message
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update button text
    submitText.textContent = 'Initialisation du paiement...';

    try {
      // Initialize SumUp payment (using groupId if multiple reservations)
      const paymentResponse = await fetch('/api/public/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: data.groupId, // Nouveau : un checkout pour tout le groupe
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        showMessage(
          `Erreur lors de l'initialisation du paiement: ${paymentData.error || 'Erreur inconnue'}`,
          'error'
        );
        return;
      }

      // Redirect to SumUp hosted checkout
      window.location.href = paymentData.checkoutUrl;
    } catch (paymentError) {
      console.error('Erreur initialisation paiement:', paymentError);
      showMessage(
        'Erreur lors de l\'initialisation du paiement. Veuillez nous contacter.',
        'error'
      );
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    showMessage('Erreur de connexion. Veuillez réessayer.', 'error');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitText.textContent = 'Réserver';
    updateTotal(); // This will disable again if no participants
  }
}

// ═══════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════

function initEventListeners() {
  if (!form) return;

  // Listen to quantity changes (skip disabled inputs)
  const inputs = getAllQuantityInputs();
  inputs.forEach((input) => {
    if (!input.disabled) {
      input.addEventListener('input', updateTotal);
      input.addEventListener('change', updateTotal);
    }
  });

  // Form submit
  form.addEventListener('submit', handleSubmit);

  // Initial calculation
  updateTotal();
}

// ═══════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventListeners);
} else {
  initEventListeners();
}

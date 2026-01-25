// Toggle booking fields
const bookingToggle = document.getElementById('booking-toggle') as HTMLInputElement;
const bookingFields = document.getElementById('booking-fields') as HTMLElement;

bookingToggle?.addEventListener('change', () => {
  if (bookingToggle.checked) {
    bookingFields?.classList.remove('hidden');
    // Rendre les champs de réservation requis
    const participantsInput = document.getElementById('participants') as HTMLInputElement;
    if (participantsInput) participantsInput.required = true;
  } else {
    bookingFields?.classList.add('hidden');
    // Retirer le required des champs de réservation
    const participantsInput = document.getElementById('participants') as HTMLInputElement;
    if (participantsInput) participantsInput.required = false;
  }
});

// Form submission
const form = document.getElementById('contact-form') as HTMLFormElement;
const messageDiv = document.getElementById('form-message') as HTMLElement;

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Récupérer les données du formulaire
  const formData = new FormData(form);
  const data: Record<string, any> = {};

  formData.forEach((value, key) => {
    data[key] = value;
  });

  // Ajouter le statut de réservation
  data.isBooking = bookingToggle?.checked || false;

  console.log('Form data:', data);

  // Pour l'instant, afficher juste un message de confirmation
  // Plus tard, on enverra les données à une API backend
  if (messageDiv) {
    messageDiv.className = 'p-4 bg-green-100 border border-green-300 text-green-800 rounded';
    messageDiv.textContent = 'Merci ! Votre demande a été envoyée. Nous vous contacterons dans les plus brefs délais.';
    messageDiv.classList.remove('hidden');
  }

  // Reset du formulaire
  form.reset();
  bookingFields?.classList.add('hidden');

  // Cacher le message après 5 secondes
  setTimeout(() => {
    messageDiv?.classList.add('hidden');
  }, 5000);
});

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

  // Désactiver le bouton pendant l'envoi
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours...';
  }

  try {
    // Récupérer les données du formulaire
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const message = formData.get('message') as string;
    const isBooking = bookingToggle?.checked || false;

    // Construire l'objet de données
    const data: Record<string, any> = {
      name,
      email,
      phone,
      message,
      isBooking,
    };

    // Ajouter les données de réservation si nécessaire
    if (isBooking) {
      const participants = parseInt(formData.get('participants') as string);
      const duration = formData.get('duration') as string;
      const formula = formData.get('formula') as string;

      data.bookingData = {
        participants,
        duration,
        formula,
      };
    }

    // Envoyer à l'API
    const response = await fetch('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Succès
      if (messageDiv) {
        messageDiv.className =
          'p-4 bg-green-100 border border-green-300 text-green-800 rounded font-medium';
        messageDiv.textContent =
          result.message ||
          'Merci ! Votre demande a été envoyée. Nous vous contacterons dans les plus brefs délais.';
        messageDiv.classList.remove('hidden');
      }

      // Reset du formulaire
      form.reset();
      bookingFields?.classList.add('hidden');

      // Cacher le message après 5 secondes
      setTimeout(() => {
        messageDiv?.classList.add('hidden');
      }, 5000);
    } else {
      // Erreur
      if (messageDiv) {
        messageDiv.className =
          'p-4 bg-red-100 border border-red-300 text-red-800 rounded font-medium';
        messageDiv.textContent =
          result.message || "Une erreur s'est produite. Veuillez réessayer.";
        messageDiv.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du formulaire:', error);
    if (messageDiv) {
      messageDiv.className = 'p-4 bg-red-100 border border-red-300 text-red-800 rounded font-medium';
      messageDiv.textContent = 'Erreur réseau. Veuillez vérifier votre connexion et réessayer.';
      messageDiv.classList.remove('hidden');
    }
  } finally {
    // Réactiver le bouton
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Envoyer ma demande';
    }
  }
});

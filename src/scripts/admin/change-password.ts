/**
 * Script pour la page de changement de mot de passe admin
 */

// Fonction pour afficher un message (succès/erreur/info)
function showMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const messageArea = document.getElementById('message-area');
  if (!messageArea) return;

  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconPaths = {
    success:
      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    error:
      'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  messageArea.innerHTML = `
    <div class="p-4 rounded-lg border ${colorClasses[type]} flex items-start">
      <svg class="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPaths[type]}"/>
      </svg>
      <div class="flex-1">
        <p class="text-sm font-medium">${message}</p>
      </div>
    </div>
  `;

  // Auto-hide après 10 secondes sauf pour les erreurs
  if (type !== 'error') {
    setTimeout(() => {
      messageArea.innerHTML = '';
    }, 10000);
  }
}

// Validation de la complexité du mot de passe côté client
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Vérifier si l'utilisateur doit changer son mot de passe au chargement
async function checkMustChangePassword() {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.admin?.mustChangePassword) {
        // Afficher l'alerte et masquer le lien retour
        const alert = document.getElementById('first-login-alert');
        const backLink = document.getElementById('back-link');
        if (alert) alert.classList.remove('hidden');
        if (backLink) backLink.classList.add('hidden');
      } else {
        // Afficher le lien retour
        const backLink = document.getElementById('back-link');
        if (backLink) backLink.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
  }
}

// Gestion de la soumission du formulaire
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si changement forcé
  checkMustChangePassword();

  const form = document.getElementById('change-password-form') as HTMLFormElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement).value;
    const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

    // Validation côté client
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    // Validation de la complexité
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      showMessage(validation.errors.join(' • '), 'error');
      return;
    }

    // Désactiver le bouton pendant la requête
    submitBtn.disabled = true;
    submitBtn.textContent = 'Changement en cours...';

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('✅ ' + data.message, 'success');

        // Réinitialiser le formulaire
        form.reset();

        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 2000);
      } else {
        showMessage(data.error || 'Erreur lors du changement de mot de passe', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Changer mon mot de passe';
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur réseau. Veuillez réessayer.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Changer mon mot de passe';
    }
  });
});

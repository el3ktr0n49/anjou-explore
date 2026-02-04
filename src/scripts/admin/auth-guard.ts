/**
 * Auth Guard - Vérification d'authentification pour les pages admin
 *
 * Centralise la logique de vérification d'authentification et de redirection
 * pour éviter la duplication de code à travers les pages admin.
 */

export interface AdminData {
  id: string;
  name: string;
  mustChangePassword: boolean;
}

export interface AuthVerifyResponse {
  authenticated: boolean;
  admin?: AdminData;
}

/**
 * Vérifie l'authentification et redirige si nécessaire
 *
 * - Si non authentifié → /admin/login
 * - Si mustChangePassword → /admin/change-password
 * - Sinon → Reste sur la page et exécute le callback optionnel
 *
 * @param onSuccess - Callback optionnel appelé après authentification réussie avec les données admin
 */
export async function checkAuthAndRedirect(
  onSuccess?: (adminData: AdminData) => void | Promise<void>
): Promise<void> {
  try {
    const response = await fetch('/api/auth/verify', { credentials: 'include' });
    const data: AuthVerifyResponse = await response.json();

    if (!data.authenticated) {
      window.location.href = '/admin/login';
      return;
    }

    if (data.admin?.mustChangePassword) {
      window.location.href = '/admin/change-password';
      return;
    }

    // Auth réussie, exécuter le callback si fourni
    if (onSuccess && data.admin) {
      await onSuccess(data.admin);
    }
  } catch (error) {
    console.error('Erreur de vérification:', error);
    window.location.href = '/admin/login';
  }
}

/**
 * Configure le bouton de déconnexion
 *
 * @param buttonId - ID du bouton de logout (défaut: 'logout-btn')
 */
export function setupLogoutButton(buttonId = 'logout-btn'): void {
  const logoutBtn = document.getElementById(buttonId);
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    });
  }
}

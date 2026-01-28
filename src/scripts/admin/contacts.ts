/**
 * Admin Contacts Page - Client-side logic
 */

interface Contact {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  message: string;
  isBooking: boolean;
  bookingData?: any;
  status: 'NEW' | 'PROCESSED' | 'ARCHIVED';
  createdAt: string;
  processedBy?: string;
  processedAt?: string;
}

let contacts: Contact[] = [];

// Vérifier l'authentification
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/verify');
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = '/admin/login';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erreur de vérification:', error);
    window.location.href = '/admin/login';
    return false;
  }
}

// Charger les contacts
export async function loadContacts(): Promise<void> {
  const authenticated = await checkAuth();
  if (!authenticated) return;

  try {
    // Construire l'URL avec filtres
    const status = (document.getElementById('filter-status') as HTMLSelectElement)?.value || '';
    const type = (document.getElementById('filter-type') as HTMLSelectElement)?.value || '';

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type === 'booking') params.append('isBooking', 'true');
    if (type === 'contact') params.append('isBooking', 'false');

    const url = `/api/admin/contacts${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      credentials: 'include', // Important: envoie les cookies avec la requête
    });
    const data = await response.json();

    if (response.ok) {
      contacts = data.contacts;
      renderContacts(contacts, data.total);
    } else {
      console.error('Erreur:', data.error);
      showError('Erreur lors du chargement des contacts');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Afficher les contacts
function renderContacts(contacts: Contact[], total: number): void {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const tableContainer = document.getElementById('table-container');
  const tbody = document.getElementById('contacts-tbody');
  const countEl = document.getElementById('contact-count');

  if (loadingState) loadingState.classList.add('hidden');

  if (countEl) {
    countEl.textContent = `${total} ${total > 1 ? 'demandes' : 'demande'}`;
  }

  if (contacts.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  if (!tbody) return;

  tbody.innerHTML = contacts
    .map(
      (contact) => `
      <tr class="table-row" data-id="${contact.id}">
        <td class="table-cell">
          ${new Date(contact.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </td>
        <td class="table-cell font-medium">${escapeHtml(contact.nom)}</td>
        <td class="table-cell">
          <a href="mailto:${contact.email}" class="text-blue-600 hover:underline" onclick="event.stopPropagation()">
            ${escapeHtml(contact.email)}
          </a>
        </td>
        <td class="table-cell">
          <a href="tel:${contact.telephone}" class="text-blue-600 hover:underline" onclick="event.stopPropagation()">
            ${escapeHtml(contact.telephone)}
          </a>
        </td>
        <td class="table-cell">
          ${
            contact.isBooking
              ? '<span class="badge badge-booking">Réservation</span>'
              : '<span class="badge">Contact</span>'
          }
        </td>
        <td class="table-cell">
          ${getStatusBadge(contact.status)}
        </td>
        <td class="table-cell" onclick="event.stopPropagation()">
          <div class="flex space-x-3">
            <button class="action-btn btn-view" onclick="toggleMessageRow('${contact.id}')" title="Voir le message">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            ${
              contact.status === 'NEW'
                ? `
              <button class="action-btn btn-process" onclick="updateStatus('${contact.id}', 'PROCESSED')">
                ✓ Traiter
              </button>
            `
                : ''
            }
            ${
              contact.status !== 'ARCHIVED'
                ? `
              <button class="action-btn btn-archive" onclick="updateStatus('${contact.id}', 'ARCHIVED')">
                📦 Archiver
              </button>
            `
                : ''
            }
            <button class="action-btn btn-delete" onclick="deleteContact('${contact.id}')" title="Supprimer définitivement">
              🗑
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');
}

// Afficher/masquer la ligne de détails du message
let currentOpenRow: string | null = null;

export function toggleMessageRow(contactId: string): void {
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) return;

  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;

  // Trouver la ligne actuelle
  const currentRow = tbody.querySelector(`tr[data-id="${contactId}"]`) as HTMLTableRowElement;
  if (!currentRow) return;

  // Vérifier si une ligne de détails existe déjà
  const existingDetailsRow = currentRow.nextElementSibling;
  const isDetailsRow = existingDetailsRow?.classList.contains('message-details-row');

  // Si c'est la même ligne, on la ferme
  if (isDetailsRow && currentOpenRow === contactId) {
    existingDetailsRow?.remove();
    currentOpenRow = null;
    return;
  }

  // Fermer la ligne ouverte précédente si elle existe
  if (currentOpenRow && currentOpenRow !== contactId) {
    const previousRow = tbody.querySelector(`tr[data-id="${currentOpenRow}"]`);
    const previousDetailsRow = previousRow?.nextElementSibling;
    if (previousDetailsRow?.classList.contains('message-details-row')) {
      previousDetailsRow.remove();
    }
  }

  // Supprimer la ligne de détails actuelle si elle existe
  if (isDetailsRow) {
    existingDetailsRow?.remove();
  }

  // Construire les données de réservation si elles existent
  let bookingDataHTML = '';
  if (contact.isBooking && contact.bookingData) {
    const data = contact.bookingData;
    bookingDataHTML = `
      <div class="booking-data-section">
        <h4 class="booking-data-title">📋 Données de réservation</h4>
        <div class="booking-data-grid">
          ${Object.entries(data)
            .map(
              ([key, value]) => `
            <div class="booking-data-item">
              <span class="booking-data-key">${escapeHtml(key)}</span>
              <span class="booking-data-value">${escapeHtml(String(value))}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // Créer une nouvelle ligne de détails
  const detailsRow = document.createElement('tr');
  detailsRow.className = 'message-details-row';
  detailsRow.innerHTML = `
    <td colspan="7" class="message-details-cell">
      <div class="message-details-content">
        <div class="message-header">
          <h3 class="message-title">💬 Message</h3>
          <button onclick="toggleMessageRow('${contactId}')" class="message-close-btn">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="message-content">
          ${escapeHtml(contact.message)}
        </div>
        ${bookingDataHTML}
      </div>
    </td>
  `;

  // Insérer la ligne de détails après la ligne actuelle
  currentRow.after(detailsRow);
  currentOpenRow = contactId;
}

function getStatusBadge(status: string): string {
  const badges = {
    NEW: '<span class="badge badge-new">Nouveau</span>',
    PROCESSED: '<span class="badge badge-processed">Traité</span>',
    ARCHIVED: '<span class="badge badge-archived">Archivé</span>',
  };
  return badges[status as keyof typeof badges] || status;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message: string): void {
  alert(message);
}

// Mettre à jour le statut
export async function updateStatus(id: string, newStatus: string): Promise<void> {
  try {
    const response = await fetch(`/api/admin/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Recharger les contacts
      await loadContacts();
    } else {
      showError(data.error || 'Erreur lors de la mise à jour');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Supprimer une demande de contact (confirmation requise)
export async function deleteContact(id: string): Promise<void> {
  const confirmed = confirm(
    '⚠️ Êtes-vous sûr de vouloir SUPPRIMER DÉFINITIVEMENT cette demande ?\n\n' +
      'Cette action est IRRÉVERSIBLE et supprimera toutes les données associées.\n\n' +
      'Recommandation : Utilisez plutôt "Archiver" pour conserver l\'historique.'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/contacts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Recharger les contacts
      await loadContacts();
    } else {
      showError(data.error || 'Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

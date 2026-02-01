/**
 * Script TypeScript pour la gestion des événements (/admin/events)
 * - Chargement des événements depuis l'API
 * - Filtrage par statut
 * - Actions CRUD
 */

// Types
interface Event {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
  paymentEnabled: boolean;
  location: string | null;
  activities: Activity[];
  _count: {
    reservations: number;
  };
}

interface Activity {
  id: string;
  name: string;
  maxParticipants: number | null;
  pricing: Pricing[];
}

interface Pricing {
  id: string;
  priceType: string;
  label: string;
  price: string;
}

// State
let events: Event[] = [];
let currentFilter: { status?: string } = {};

// ═══════════════════════════════════════════════════════════
// Authentication & Initialization
// ═══════════════════════════════════════════════════════════

async function checkAuth() {
  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include',
    });
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

// ═══════════════════════════════════════════════════════════
// Toast & Confirm System
// ═══════════════════════════════════════════════════════════

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
    error: '<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
    info: '<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>',
  };

  toast.innerHTML = `
    ${icons[type]}
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">✕</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn?.addEventListener('click', () => {
    toast.classList.add('slide-out');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('slide-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

let confirmResolve: ((value: boolean) => void) | null = null;

function showConfirm(message: string, details?: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolve = resolve;

    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    const detailsEl = document.getElementById('confirm-details');
    const detailsList = document.getElementById('confirm-details-list');

    if (!modal || !messageEl) return resolve(false);

    messageEl.textContent = message;

    if (details && details.length > 0 && detailsEl && detailsList) {
      detailsList.innerHTML = details.map((d) => `<li>${escapeHtml(d)}</li>`).join('');
      detailsEl.classList.remove('hidden');
    } else if (detailsEl) {
      detailsEl.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  });
}

function closeConfirm(result: boolean) {
  const modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

// ═══════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════

async function loadEvents() {
  try {
    // Show loading
    const loadingEl = document.getElementById('loading-state');
    const tableEl = document.getElementById('table-container');
    const emptyEl = document.getElementById('empty-state');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (tableEl) tableEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    // Build query params
    const params = new URLSearchParams();
    if (currentFilter.status) {
      params.append('status', currentFilter.status);
    }

    const response = await fetch(`/api/admin/events?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des événements');
    }

    const data = await response.json();
    events = data.events;

    // Update count
    const countEl = document.getElementById('event-count');
    if (countEl) {
      countEl.textContent = `${data.total}`;
    }

    // Render events
    renderEvents();

    // Hide loading, show table or empty state
    if (loadingEl) loadingEl.classList.add('hidden');
    if (events.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
    } else {
      if (tableEl) tableEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Erreur lors du chargement des événements:', error);
    alert('Erreur lors du chargement des événements');
  }
}

async function deleteEvent(eventId: string, eventName: string) {
  const confirmed = await showConfirm(
    `Voulez-vous vraiment supprimer l'événement "${eventName}" ?`,
    [
      'Toutes les activités associées',
      'Tous les tarifs associés',
      'Note: La suppression sera bloquée si des réservations existent',
    ]
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.reservationsCount) {
        showToast(
          `Impossible de supprimer : ${data.reservationsCount} réservation(s) existent. Archivez-les d'abord.`,
          'error'
        );
      } else {
        showToast(data.error || 'Erreur lors de la suppression', 'error');
      }
      return;
    }

    showToast('Événement supprimé avec succès', 'success');
    // Reload events
    await loadEvents();
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    showToast('Erreur lors de la suppression', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════

function attachEventListeners() {
  // View event buttons
  document.querySelectorAll('[data-action="view-event"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const eventId = (btn as HTMLElement).dataset.eventId;
      if (eventId) {
        window.location.href = `/admin/events/${eventId}`;
      }
    });
  });

  // Delete event buttons
  document.querySelectorAll('[data-action="delete-event"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const eventId = (btn as HTMLElement).dataset.eventId;
      const eventName = (btn as HTMLElement).dataset.eventName;
      if (eventId && eventName) {
        deleteEvent(eventId, eventName);
      }
    });
  });
}

function renderEvents() {
  const tbody = document.getElementById('events-tbody');
  if (!tbody) return;

  if (events.length === 0) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = events
    .map(
      (event) => `
    <tr data-event-id="${event.id}">
      <!-- Événement -->
      <td class="px-6 py-4">
        <div>
          <p class="font-semibold text-[var(--color-anjou-brown)]">${escapeHtml(event.name)}</p>
          <p class="text-xs text-[var(--color-anjou-olive)] mt-1">
            ${event.slug} ${event.location ? `• ${escapeHtml(event.location)}` : ''}
          </p>
        </div>
      </td>

      <!-- Date -->
      <td class="px-6 py-4 text-sm text-[var(--color-anjou-olive)]">
        ${formatDate(event.date)}
      </td>

      <!-- Statut -->
      <td class="px-6 py-4">
        ${getStatusBadge(event.status)}
      </td>

      <!-- Activités -->
      <td class="px-6 py-4">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-[var(--color-anjou-brown)]">${event.activities.length}</span>
          <span class="text-xs text-[var(--color-anjou-olive)]">
            ${event.activities.length === 0 ? 'aucune' : event.activities.length === 1 ? 'activité' : 'activités'}
          </span>
        </div>
      </td>

      <!-- Réservations -->
      <td class="px-6 py-4">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-[var(--color-anjou-brown)]">${event._count.reservations}</span>
          <span class="text-xs text-[var(--color-anjou-olive)]">
            ${event._count.reservations === 0 ? 'aucune' : event._count.reservations === 1 ? 'réservation' : 'réservations'}
          </span>
        </div>
      </td>

      <!-- Actions -->
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end space-x-2">
          <!-- Bouton Voir/Éditer -->
          <button
            class="btn-action btn-view"
            data-action="view-event"
            data-event-id="${event.id}"
            title="Voir les détails"
            style="cursor: pointer;"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="pointer-events: none;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>

          <!-- Bouton Supprimer -->
          <button
            class="btn-action btn-delete"
            data-action="delete-event"
            data-event-id="${event.id}"
            data-event-name="${escapeHtml(event.name)}"
            title="Supprimer"
            style="cursor: pointer;"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="pointer-events: none;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  // Attach listeners to newly rendered buttons
  attachEventListeners();
}

function getStatusBadge(status: string): string {
  const badges: Record<string, { label: string; class: string }> = {
    DRAFT: { label: 'Brouillon', class: 'badge-draft' },
    OPEN: { label: 'Ouvert', class: 'badge-open' },
    CLOSED: { label: 'Fermé', class: 'badge-closed' },
    ARCHIVED: { label: 'Archivé', class: 'badge-archived' },
  };

  const badge = badges[status] || { label: status, class: 'badge-draft' };
  return `<span class="badge ${badge.class}">${badge.label}</span>`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
// UI Event Listeners
// ═══════════════════════════════════════════════════════════

function initEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      window.location.href = '/admin/login';
    }
  });

  // Filter status
  const filterStatus = document.getElementById('filter-status') as HTMLSelectElement;
  filterStatus?.addEventListener('change', () => {
    currentFilter.status = filterStatus.value || undefined;
    loadEvents();
  });

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn?.addEventListener('click', () => {
    loadEvents();
  });

  // Create event buttons
  const createEventBtn = document.getElementById('create-event-btn');
  const createEventEmptyBtn = document.getElementById('create-event-empty-btn');

  createEventBtn?.addEventListener('click', () => {
    window.location.href = '/admin/events/new';
  });

  createEventEmptyBtn?.addEventListener('click', () => {
    window.location.href = '/admin/events/new';
  });
}

// ═══════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════

async function init() {
  const isAuth = await checkAuth();
  if (!isAuth) return;

  initEventListeners();
  await loadEvents();
}

// Start
init();

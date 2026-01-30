/**
 * Admin Reservations Page - Client-side logic
 */

interface PaymentTransaction {
  id: string;
  checkoutId: string;
  transactionId?: string;
  amount: number;
  status: 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

interface Reservation {
  id: string;
  eventId: string;
  event: {
    name: string;
    slug: string;
    date: string;
  };
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  activityName: string;
  participants: any;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  sumupCheckoutId?: string;
  sumupTransactionId?: string;
  paidAt?: string;
  notes?: string;
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  paymentTransactions: PaymentTransaction[];
  createdAt: string;
  updatedAt: string;
}

let reservations: Reservation[] = [];

// Vérifier l'authentification
export async function checkAuth(): Promise<boolean> {
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

// Charger les réservations
export async function loadReservations(): Promise<void> {
  const authenticated = await checkAuth();
  if (!authenticated) return;

  try {
    // Construire l'URL avec filtres
    const paymentStatus =
      (document.getElementById('filter-payment-status') as HTMLSelectElement)?.value || '';
    const eventId = (document.getElementById('filter-event') as HTMLSelectElement)?.value || '';
    const archived =
      (document.getElementById('filter-archived') as HTMLSelectElement)?.value || 'false';

    const params = new URLSearchParams();
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (eventId) params.append('eventId', eventId);
    if (archived) params.append('archived', archived);

    const url = `/api/admin/reservations${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      credentials: 'include',
    });
    const data = await response.json();

    if (response.ok) {
      reservations = data.reservations;
      renderReservations(reservations, data.total, data.totalAmount);

      // Mettre à jour les options du filtre événement
      await populateEventFilter(reservations);
    } else {
      console.error('Erreur:', data.error);
      showError('Erreur lors du chargement des réservations');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Remplir le filtre événement avec les événements uniques
async function populateEventFilter(reservations: Reservation[]): Promise<void> {
  const filterEvent = document.getElementById('filter-event') as HTMLSelectElement;
  if (!filterEvent) return;

  // Extraire les événements uniques avec leur ID
  const uniqueEvents = Array.from(
    new Map(reservations.map((r) => [r.eventId, { id: r.eventId, ...r.event }])).values()
  );

  // Conserver la valeur sélectionnée actuelle
  const currentValue = filterEvent.value;

  // Générer les options (utiliser eventId au lieu de slug)
  const optionsHTML = [
    '<option value="">Tous les événements</option>',
    ...uniqueEvents.map(
      (event) => `
      <option value="${event.id}" ${currentValue === event.id ? 'selected' : ''}>
        ${escapeHtml(event.name)}
      </option>
    `
    ),
  ].join('');

  filterEvent.innerHTML = optionsHTML;
}

// Afficher les réservations
function renderReservations(
  reservations: Reservation[],
  total: number,
  totalAmount: number
): void {
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const tableContainer = document.getElementById('table-container');
  const tbody = document.getElementById('reservations-tbody');
  const countEl = document.getElementById('reservation-count');
  const amountEl = document.getElementById('total-amount');

  if (loadingState) loadingState.classList.add('hidden');

  if (countEl) {
    countEl.textContent = `${total} ${total > 1 ? 'réservations' : 'réservation'}`;
  }

  if (amountEl) {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(totalAmount);
    amountEl.textContent = formatted;
  }

  if (reservations.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  if (!tbody) return;

  tbody.innerHTML = reservations
    .map(
      (reservation) => `
      <tr class="table-row" data-id="${reservation.id}">
        <td class="table-cell">
          ${new Date(reservation.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </td>
        <td class="table-cell font-medium">${escapeHtml(reservation.event.name)}</td>
        <td class="table-cell">${escapeHtml(reservation.prenom)} ${escapeHtml(reservation.nom)}</td>
        <td class="table-cell">
          <a href="mailto:${reservation.email}" class="text-blue-600 hover:underline text-sm" onclick="event.stopPropagation()">
            ${escapeHtml(reservation.email)}
          </a>
        </td>
        <td class="table-cell text-sm">${escapeHtml(reservation.activityName)}</td>
        <td class="table-cell text-center">
          ${formatParticipants(reservation.participants)}
        </td>
        <td class="table-cell font-semibold text-right">
          ${new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
          }).format(reservation.amount)}
        </td>
        <td class="table-cell">
          ${getPaymentStatusBadge(reservation.paymentStatus)}
        </td>
        <td class="table-cell" onclick="event.stopPropagation()">
          <div class="flex space-x-2">
            ${
              !reservation.archived && reservation.paymentStatus === 'PENDING'
                ? getPayButton(reservation)
                : ''
            }
            ${
              !reservation.archived && reservation.paymentStatus === 'PAID'
                ? `
              <button
                class="action-btn btn-archive text-xs px-2 py-1"
                onclick="updatePaymentStatus('${reservation.id}', 'REFUNDED')"
                title="Rembourser"
              >
                ↩ Rembourser
              </button>
            `
                : ''
            }
            ${
              !reservation.archived
                ? `
              <button
                class="action-btn btn-archive text-xs px-2 py-1"
                onclick="archiveReservation('${reservation.id}', true)"
                title="Archiver"
              >
                📦 Archiver
              </button>
            `
                : `
              <button
                class="action-btn btn-process text-xs px-2 py-1"
                onclick="archiveReservation('${reservation.id}', false)"
                title="Désarchiver"
              >
                ↩ Restaurer
              </button>
            `
            }
            <button
              class="action-btn btn-delete text-xs px-2 py-1"
              onclick="deleteReservation('${reservation.id}')"
              title="Supprimer définitivement"
            >
              🗑
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');
}

// Générer le bouton "Payé" selon les transactions SumUp
function getPayButton(reservation: Reservation): string {
  // Vérifier s'il y a des transactions SumUp actives (INITIATED ou PENDING)
  const hasActiveTransactions = reservation.paymentTransactions.some(
    (t) => t.status === 'INITIATED' || t.status === 'PENDING'
  );

  if (hasActiveTransactions) {
    // Bouton désactivé avec tooltip explicatif
    return `
      <button
        class="action-btn btn-process text-xs px-2 py-1 opacity-50 cursor-not-allowed"
        disabled
        title="Paiement SumUp en cours - Impossible de valider manuellement"
      >
        ✓ Payé
      </button>
    `;
  }

  // Bouton actif (pas de transaction SumUp active)
  return `
    <button
      class="action-btn btn-process text-xs px-2 py-1"
      onclick="updatePaymentStatus('${reservation.id}', 'PAID')"
      title="Marquer comme payé manuellement (paiement sur place)"
    >
      ✓ Payé
    </button>
  `;
}

// Formater les participants
function formatParticipants(participants: any): string {
  if (!participants) return '?';

  try {
    const parsed = typeof participants === 'string' ? JSON.parse(participants) : participants;
    const entries = Object.entries(parsed) as [string, number][];
    return entries.map(([type, count]) => `${count} ${type}`).join('<br>');
  } catch {
    return String(participants);
  }
}

// Badge statut paiement
function getPaymentStatusBadge(status: string): string {
  const badges = {
    PENDING: '<span class="badge badge-warning">⏳ En attente</span>',
    PAID: '<span class="badge badge-success">✓ Payé</span>',
    FAILED: '<span class="badge badge-error">✗ Échoué</span>',
    REFUNDED: '<span class="badge badge-info">↩ Remboursé</span>',
    CANCELLED: '<span class="badge badge-archived">Annulé</span>',
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

// Mettre à jour le statut de paiement
export async function updatePaymentStatus(id: string, newStatus: string): Promise<void> {
  const confirmed = confirm(
    `Êtes-vous sûr de vouloir marquer cette réservation comme "${newStatus}" ?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: newStatus }),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Recharger les réservations
      await loadReservations();
    } else {
      showError(data.error || 'Erreur lors de la mise à jour');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Archiver ou désarchiver une réservation
export async function archiveReservation(id: string, archive: boolean): Promise<void> {
  const action = archive ? 'archiver' : 'désarchiver';
  const confirmed = confirm(`Êtes-vous sûr de vouloir ${action} cette réservation ?`);

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: archive }),
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Recharger les réservations
      await loadReservations();
    } else {
      showError(data.error || `Erreur lors de l'${action}age`);
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Supprimer une réservation (double confirmation)
export async function deleteReservation(id: string): Promise<void> {
  const firstConfirm = confirm(
    '⚠️ ATTENTION : Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT cette réservation.\n\n' +
      'Cette action est IRRÉVERSIBLE et supprimera :\n' +
      '- La réservation\n' +
      '- L\'historique des paiements\n' +
      '- Toutes les données associées\n\n' +
      'Voulez-vous vraiment continuer ?'
  );

  if (!firstConfirm) return;

  // Deuxième confirmation
  const secondConfirm = confirm(
    '⚠️ DERNIÈRE CONFIRMATION :\n\n' +
      'Tapez "SUPPRIMER" dans votre esprit et cliquez OK pour confirmer la suppression définitive.\n\n' +
      'Recommandation : Utilisez plutôt "Archiver" pour conserver l\'historique.'
  );

  if (!secondConfirm) return;

  try {
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      // Recharger les réservations
      await loadReservations();
    } else {
      showError(data.error || 'Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showError('Erreur serveur');
  }
}

// Exporter en CSV
export function exportToCSV(): void {
  if (reservations.length === 0) {
    alert('Aucune réservation à exporter');
    return;
  }

  // Headers CSV
  const headers = [
    'Date',
    'Événement',
    'Prénom',
    'Nom',
    'Email',
    'Téléphone',
    'Activité',
    'Participants',
    'Montant (EUR)',
    'Statut Paiement',
    'Transaction ID',
    'Date Paiement',
  ];

  // Lignes CSV
  const rows = reservations.map((r) => {
    const participantsStr =
      typeof r.participants === 'string'
        ? r.participants
        : JSON.stringify(r.participants).replace(/"/g, '""');

    return [
      new Date(r.createdAt).toLocaleDateString('fr-FR'),
      r.event.name.replace(/"/g, '""'),
      r.prenom.replace(/"/g, '""'),
      r.nom.replace(/"/g, '""'),
      r.email,
      r.telephone,
      r.activityName.replace(/"/g, '""'),
      participantsStr,
      r.amount.toString(),
      r.paymentStatus,
      r.sumupTransactionId || '',
      r.paidAt ? new Date(r.paidAt).toLocaleDateString('fr-FR') : '',
    ];
  });

  // Construire le CSV
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Télécharger le fichier
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `reservations_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

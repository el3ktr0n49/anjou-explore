import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ToastContainer from '../ui/ToastContainer';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { Event, ToastType } from '../types';

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [totalEvents, setTotalEvents] = useState(0);
  const [showToast, setShowToast] = useState<((message: string, type: ToastType) => void) | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDetails, setConfirmDetails] = useState<string[]>([]);

  const handleToastEmit = useCallback((toastFn: (message: string, type: ToastType) => void) => {
    setShowToast(() => toastFn);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== '') {
        params.append('status', statusFilter);
      }

      const url = `/api/admin/events${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des événements');
      }

      const data = await response.json();
      setEvents(data.events);
      setTotalEvents(data.total);
    } catch (error: any) {
      console.error('Erreur:', error);
      if (showToast) {
        showToast('Erreur lors du chargement des événements', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    setConfirmMessage(`Voulez-vous vraiment supprimer l'événement "${eventName}" ?`);
    setConfirmDetails([
      'Toutes les activités associées',
      'Tous les tarifs associés',
      'Note: La suppression sera bloquée si des réservations existent',
    ]);
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.reservationsCount) {
            if (showToast) {
              showToast(
                `Impossible de supprimer : ${data.reservationsCount} réservation(s) existent. Archivez-les d'abord.`,
                'error'
              );
            }
          } else {
            if (showToast) {
              showToast(data.error || 'Erreur lors de la suppression', 'error');
            }
          }
          return;
        }

        if (showToast) {
          showToast('Événement supprimé avec succès', 'success');
        }
        await loadEvents();
      } catch (error: any) {
        console.error('Erreur:', error);
        if (showToast) {
          showToast('Erreur lors de la suppression', 'error');
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleViewEvent = (eventId: string) => {
    window.location.href = `/admin/events/${eventId}`;
  };

  const handleCreateEvent = () => {
    window.location.href = '/admin/events/new';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Brouillon', className: 'badge-draft' },
      OPEN: { label: 'Ouvert', className: 'badge-open' },
      CLOSED: { label: 'Fermé', className: 'badge-closed' },
      ARCHIVED: { label: 'Archivé', className: 'badge-archived' },
    };

    const badge = badges[status] || { label: status, className: 'badge-draft' };
    return <span class={`badge ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <div>
      <ToastContainer onToastEmit={handleToastEmit} />

      {/* Header with Create Button */}
      <div class="flex justify-between items-center mb-6">
        <div></div>
        <button
          onClick={handleCreateEvent}
          class="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] text-white rounded-xl hover:shadow-lg transition font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>Nouvel Événement</span>
        </button>
      </div>

      {/* Filtres */}
      <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden mb-8">
        <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5"></div>

        <div class="p-6">
          <h2 class="text-xl font-serif text-[var(--color-anjou-brown)] mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-[var(--color-anjou-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            Filtres
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtre Statut */}
            <div>
              <label for="filter-status" class="block text-sm font-medium text-[var(--color-anjou-brown)] mb-2">
                Statut
              </label>
              <select
                id="filter-status"
                class="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
              >
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="OPEN">Ouvert</option>
                <option value="CLOSED">Fermé</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>

            {/* Placeholder */}
            <div></div>

            {/* Bouton Rafraîchir */}
            <div class="flex items-end">
              <button onClick={loadEvents} class="refresh-button">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Rafraîchir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des événements */}
      <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden">
        <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5"></div>

        {/* Loading state */}
        {loading && (
          <div class="p-12 text-center">
            <div class="inline-flex items-center space-x-2 text-[var(--color-anjou-olive)]">
              <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Chargement des événements...</span>
            </div>
          </div>
        )}

        {/* Table container */}
        {!loading && events.length > 0 && (
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-[var(--color-anjou-beige)]/30 border-b border-[var(--color-anjou-beige)]">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Événement
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Statut
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Activités
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Réservations
                  </th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-anjou-beige)]/50">
                {events.map((event) => (
                  <tr key={event.id} class="hover:bg-[var(--color-anjou-beige)]/10 transition">
                    {/* Événement */}
                    <td class="px-6 py-4">
                      <div>
                        <p class="font-semibold text-[var(--color-anjou-brown)]">{event.name}</p>
                        <p class="text-xs text-[var(--color-anjou-olive)] mt-1">
                          {event.slug} {event.location ? `• ${event.location}` : ''}
                        </p>
                      </div>
                    </td>

                    {/* Date */}
                    <td class="px-6 py-4 text-sm text-[var(--color-anjou-olive)]">
                      {formatDate(event.date)}
                    </td>

                    {/* Statut */}
                    <td class="px-6 py-4">{getStatusBadge(event.status)}</td>

                    {/* Activités */}
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-2">
                        <span class="font-semibold text-[var(--color-anjou-brown)]">
                          {event.activities.length}
                        </span>
                        <span class="text-xs text-[var(--color-anjou-olive)]">
                          {event.activities.length === 0
                            ? 'aucune'
                            : event.activities.length === 1
                            ? 'activité'
                            : 'activités'}
                        </span>
                      </div>
                    </td>

                    {/* Réservations */}
                    <td class="px-6 py-4">
                      <div class="flex items-center space-x-2">
                        <span class="font-semibold text-[var(--color-anjou-brown)]">
                          {event.reservations?.length || 0}
                        </span>
                        <span class="text-xs text-[var(--color-anjou-olive)]">
                          {(event.reservations?.length || 0) === 0
                            ? 'aucune'
                            : (event.reservations?.length || 0) === 1
                            ? 'réservation'
                            : 'réservations'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        {/* Bouton Voir/Éditer */}
                        <button
                          onClick={() => handleViewEvent(event.id)}
                          class="btn-action btn-view"
                          title="Voir les détails"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.name)}
                          class="btn-action btn-delete"
                          title="Supprimer"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <div class="p-12 text-center">
            <svg class="mx-auto h-16 w-16 text-[var(--color-anjou-olive)]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <h3 class="text-lg font-medium text-[var(--color-anjou-brown)] mb-2">
              Aucun événement trouvé
            </h3>
            <p class="text-sm text-[var(--color-anjou-olive)] mb-6">
              Commencez par créer votre premier événement
            </p>
            <button
              onClick={handleCreateEvent}
              class="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] text-white rounded-lg hover:shadow-lg transition font-medium"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>Créer un événement</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        message={confirmMessage}
        details={confirmDetails}
      />
    </div>
  );
}

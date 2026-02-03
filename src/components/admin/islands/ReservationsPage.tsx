import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ToastContainer from '../ui/ToastContainer';
import ConfirmDialog from '../ui/ConfirmDialog';
import ReservationFilters from './ReservationFilters';
import type { ReservationFull, ToastType } from '../types';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationFull[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState<((message: string, type: ToastType) => void) | null>(null);

  // Filters state
  const [paymentStatus, setPaymentStatus] = useState('');
  const [eventId, setEventId] = useState('');
  const [archived, setArchived] = useState('false');

  // Stats
  const [totalReservations, setTotalReservations] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Confirm dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDetails, setConfirmDetails] = useState<string[]>([]);

  // ========================================
  // Load Reservations
  // ========================================

  const loadReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (paymentStatus && paymentStatus !== '') params.append('paymentStatus', paymentStatus);
      if (eventId && eventId !== '') params.append('eventId', eventId);
      // Always send archived unless it's 'all'
      if (archived !== 'all') params.append('archived', archived);

      const url = `/api/admin/reservations${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }

      const data = await response.json();
      setReservations(data.reservations);
      setTotalReservations(data.total);
      setTotalAmount(data.totalAmount);

      // Extract unique events for filter
      const uniqueEvents = Array.from(
        new Map(data.reservations.map((r: ReservationFull) => [r.event.id, r.event])).values()
      );
      setFilteredEvents(uniqueEvents);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading reservations:', error);
      if (showToast) {
        showToast('Erreur lors du chargement des réservations', 'error');
      }
      setIsLoading(false);
    }
  }, [paymentStatus, eventId, archived, showToast]);

  // Initial load and reload on filter change
  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // ========================================
  // Actions
  // ========================================

  const handleMarkAsPaid = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      if (showToast) {
        showToast('Réservation marquée comme payée', 'success');
      }
      await loadReservations();
    } catch (error: any) {
      console.error('Error:', error);
      if (showToast) {
        showToast(error.message || 'Erreur lors de la mise à jour', 'error');
      }
    }
  };

  const handleRefund = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: 'REFUNDED' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du remboursement');
      }

      if (showToast) {
        showToast('Réservation remboursée avec succès', 'success');
      }
      await loadReservations();
    } catch (error: any) {
      console.error('Error:', error);
      if (showToast) {
        showToast(error.message || 'Erreur lors du remboursement', 'error');
      }
    }
  };

  const handleArchive = async (reservationId: string, archive: boolean) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archived: archive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'archivage');
      }

      if (showToast) {
        showToast(archive ? 'Réservation archivée' : 'Réservation restaurée', 'success');
      }
      await loadReservations();
    } catch (error: any) {
      console.error('Error:', error);
      if (showToast) {
        showToast(error.message || 'Erreur lors de l\'opération', 'error');
      }
    }
  };


  // ========================================
  // Export CSV
  // ========================================

  const handleExportCSV = () => {
    const headers = [
      'Date inscription',
      'Événement',
      'Prénom',
      'Nom',
      'Email',
      'Téléphone',
      'Activité',
      'Participants',
      'Montant',
      'Statut',
      'Transaction ID',
      'Date paiement',
    ];

    const rows = reservations.map((r) => [
      new Date(r.createdAt).toLocaleDateString('fr-FR'),
      r.event.name,
      r.prenom,
      r.nom,
      r.email,
      r.telephone,
      r.activityName,
      formatParticipants(r.participants),
      `${r.amount}€`,
      getPaymentStatusLabel(r.paymentStatus),
      r.sumupTransactionId || '',
      r.paidAt ? new Date(r.paidAt).toLocaleDateString('fr-FR') : '',
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reservations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast('Export CSV généré avec succès', 'success');
    }
  };

  // ========================================
  // Helpers
  // ========================================

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatParticipants = (participants: Record<string, number>): string => {
    return Object.entries(participants)
      .map(([type, count]) => `${count} ${type}(s)`)
      .join(', ');
  };

  // ========================================
  // Group Reservations by groupId
  // ========================================

  type GroupedReservation = {
    groupId: string | null;
    firstReservation: ReservationFull;
    activities: Array<{
      activityName: string;
      participants: Record<string, number>;
      amount: number;
    }>;
    totalAmount: number;
    allReservations: ReservationFull[];
    // Computed properties
    paymentStatus: string; // PAID if all paid, PENDING otherwise
    archived: boolean; // true if all archived
    hasActiveSumUpTransaction: boolean;
  };

  const groupReservations = (reservations: ReservationFull[]): GroupedReservation[] => {
    const groups = new Map<string, ReservationFull[]>();

    // Group by groupId (or individual id if no groupId)
    reservations.forEach((reservation) => {
      const key = reservation.groupId || reservation.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(reservation);
    });

    // Transform groups into GroupedReservation objects
    return Array.from(groups.entries()).map(([groupId, resGroup]) => {
      const firstReservation = resGroup[0];
      const totalAmount = resGroup.reduce((sum, r) => sum + Number(r.amount), 0);

      // Determine payment status (PAID if all paid, otherwise take first status)
      const allPaid = resGroup.every((r) => r.paymentStatus === 'PAID');
      const anyFailed = resGroup.some((r) => r.paymentStatus === 'FAILED');
      const paymentStatus = allPaid ? 'PAID' : anyFailed ? 'FAILED' : firstReservation.paymentStatus;

      // Determine if archived (all must be archived)
      const archived = resGroup.every((r) => r.archived);

      // Check for active SumUp transactions
      const hasActiveSumUpTransaction = resGroup.some((r) =>
        r.paymentTransactions.some((t) => t.status === 'INITIATED' || t.status === 'PENDING')
      );

      return {
        groupId: firstReservation.groupId,
        firstReservation,
        activities: resGroup.map((r) => ({
          activityName: r.activityName,
          participants: r.participants,
          amount: Number(r.amount),
        })),
        totalAmount,
        allReservations: resGroup,
        paymentStatus,
        archived,
        hasActiveSumUpTransaction,
      };
    });
  };

  const groupedReservations = groupReservations(reservations);

  const getPaymentStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      PAID: 'Payé',
      FAILED: 'Échoué',
      REFUNDED: 'Remboursé',
      CANCELLED: 'Annulé',
    };
    return labels[status] || status;
  };

  const getPaymentStatusBadge = (status: string): h.JSX.Element => {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-800'}`}>
        {getPaymentStatusLabel(status)}
      </span>
    );
  };


  // Toast callback
  const handleToastEmit = (toastFn: (message: string, type: ToastType) => void) => {
    setShowToast(() => toastFn);
  };

  // Confirm dialog handlers
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

  if (isLoading) {
    return (
      <div class="text-center py-16">
        <div class="inline-flex items-center space-x-2 text-[var(--color-anjou-olive)]">
          <svg class="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span class="text-lg font-medium">Chargement des réservations...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer onToastEmit={handleToastEmit} />

      {/* Filters */}
      <ReservationFilters
        paymentStatus={paymentStatus}
        eventId={eventId}
        archived={archived}
        events={filteredEvents}
        onPaymentStatusChange={setPaymentStatus}
        onEventChange={setEventId}
        onArchivedChange={setArchived}
        onRefresh={loadReservations}
      />

      {/* Header with stats and export */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-6">
          <div class="text-sm text-[var(--color-anjou-olive)]">
            <span class="font-semibold">{totalReservations}</span> réservation(s)
          </div>
          <div class="text-sm text-[var(--color-anjou-olive)]">
            Total: <span class="font-semibold">{totalAmount.toFixed(2)}€</span>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          class="px-4 py-2 bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] text-white rounded-lg hover:shadow-lg transition font-medium text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      {groupedReservations.length === 0 ? (
        <div class="bg-white rounded-xl shadow-md border border-[var(--color-anjou-beige)]/50 p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-[var(--color-anjou-olive)]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p class="text-[var(--color-anjou-olive)]">Aucune réservation trouvée</p>
        </div>
      ) : (
        <div class="bg-white rounded-xl shadow-md border border-[var(--color-anjou-beige)]/50 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-[var(--color-anjou-beige)]">
              <thead class="bg-[var(--color-anjou-beige)]/30">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Événement
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Nom
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Email
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Activités
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Participants
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Montant Total
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Statut
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-anjou-brown)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-[var(--color-anjou-beige)]">
                {groupedReservations.map((group) => (
                  <tr key={group.groupId || group.firstReservation.id} class={group.archived ? 'bg-gray-50 opacity-60' : ''}>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-anjou-brown)]">
                      {formatDate(group.firstReservation.createdAt)}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-anjou-brown)]">
                      {group.firstReservation.event.name}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-anjou-brown)]">
                      {group.firstReservation.prenom} {group.firstReservation.nom}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-anjou-brown)]">
                      <a href={`mailto:${group.firstReservation.email}`} class="text-[var(--color-anjou-gold)] hover:underline">
                        {group.firstReservation.email}
                      </a>
                    </td>
                    <td class="px-4 py-3 text-sm text-[var(--color-anjou-brown)]">
                      {group.activities.length === 1 ? (
                        group.activities[0].activityName
                      ) : (
                        <div class="space-y-1">
                          {group.activities.map((activity, idx) => (
                            <div key={idx} class="text-xs">
                              • {activity.activityName}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td class="px-4 py-3 text-sm text-[var(--color-anjou-brown)]">
                      {group.activities.length === 1 ? (
                        formatParticipants(group.activities[0].participants)
                      ) : (
                        <div class="space-y-1">
                          {group.activities.map((activity, idx) => (
                            <div key={idx} class="text-xs">
                              {formatParticipants(activity.participants)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-[var(--color-anjou-brown)]">
                      {group.totalAmount.toFixed(2)}€
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm">
                      {getPaymentStatusBadge(group.paymentStatus)}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex items-center justify-end gap-2">
                        {/* Bouton Payé */}
                        {group.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => {
                              // Mark all reservations in group as paid
                              group.allReservations.forEach(r => handleMarkAsPaid(r.id));
                            }}
                            disabled={group.hasActiveSumUpTransaction}
                            class={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              group.hasActiveSumUpTransaction
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={
                              group.hasActiveSumUpTransaction
                                ? 'Paiement SumUp en cours'
                                : 'Marquer comme payé manuellement'
                            }
                          >
                            ✓ Payé
                          </button>
                        )}

                        {/* Bouton Rembourser - Masqué pour Phase 1 (fonction non implémentée) */}
                        {/* TODO: Réactiver quand la gestion des remboursements sera implémentée (Phase F+) */}
                        {/* {group.paymentStatus === 'PAID' && (
                          <button
                            onClick={() => {
                              group.allReservations.forEach(r => handleRefund(r.id));
                            }}
                            class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium transition"
                            title="Rembourser"
                          >
                            ↩ Rembourser
                          </button>
                        )} */}

                        {/* Bouton Archiver/Restaurer */}
                        {!group.archived ? (
                          <button
                            onClick={() => {
                              // Archive all reservations in group
                              group.allReservations.forEach(r => handleArchive(r.id, true));
                            }}
                            class="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xl font-medium transition"
                            title="Archiver"
                          >
                            📦
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Restore all reservations in group
                              group.allReservations.forEach(r => handleArchive(r.id, false));
                            }}
                            class="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-xl font-medium transition"
                            title="Restaurer"
                          >
                            ↩
                          </button>
                        )}

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => {
                            // Show confirmation with all activities
                            const activitiesList = group.activities.map(a => a.activityName).join(', ');
                            setConfirmMessage(`Voulez-vous vraiment supprimer définitivement la réservation de ${group.firstReservation.prenom} ${group.firstReservation.nom} ?`);
                            setConfirmDetails([
                              'Cette action est irréversible',
                              `Activité(s): ${activitiesList}`,
                              `Montant total: ${group.totalAmount.toFixed(2)}€`,
                              'Toutes les données seront perdues',
                              'Les transactions SumUp associées seront supprimées',
                            ]);
                            setConfirmAction(() => async () => {
                              try {
                                // Delete all reservations in group
                                for (const reservation of group.allReservations) {
                                  const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.error || 'Erreur lors de la suppression');
                                  }
                                }

                                if (showToast) {
                                  showToast(`Réservation${group.allReservations.length > 1 ? 's' : ''} supprimée${group.allReservations.length > 1 ? 's' : ''} avec succès`, 'success');
                                }
                                await loadReservations();
                              } catch (error: any) {
                                console.error('Error:', error);
                                if (showToast) {
                                  showToast(error.message || 'Erreur lors de la suppression', 'error');
                                }
                              }
                            });
                            setIsConfirmOpen(true);
                          }}
                          class="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xl font-medium transition"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        message={confirmMessage}
        details={confirmDetails}
      />
    </>
  );
}

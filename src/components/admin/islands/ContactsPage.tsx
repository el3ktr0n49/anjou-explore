import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ToastContainer from '../ui/ToastContainer';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { ToastType } from '../types';

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [totalContacts, setTotalContacts] = useState(0);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<((message: string, type: ToastType) => void) | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDetails, setConfirmDetails] = useState<string[]>([]);

  const handleToastEmit = useCallback((toastFn: (message: string, type: ToastType) => void) => {
    setShowToast(() => toastFn);
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== '') {
        params.append('status', statusFilter);
      }
      if (typeFilter === 'booking') {
        params.append('isBooking', 'true');
      } else if (typeFilter === 'contact') {
        params.append('isBooking', 'false');
      }

      const url = `/api/admin/contacts${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des contacts');
      }

      const data = await response.json();
      setContacts(data.contacts);
      setTotalContacts(data.total);
    } catch (error: any) {
      console.error('Erreur:', error);
      if (showToast) {
        showToast('Erreur lors du chargement des contacts', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, showToast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const toggleMessageRow = (contactId: string) => {
    if (expandedRowId === contactId) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(contactId);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (showToast) {
          showToast(data.error || 'Erreur lors de la mise à jour', 'error');
        }
        return;
      }

      if (showToast) {
        showToast(
          newStatus === 'PROCESSED' ? 'Demande marquée comme traitée' : 'Demande archivée',
          'success'
        );
      }
      await loadContacts();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (showToast) {
        showToast('Erreur serveur', 'error');
      }
    }
  };

  const handleDeleteContact = (id: string) => {
    setConfirmMessage('⚠️ Êtes-vous sûr de vouloir SUPPRIMER DÉFINITIVEMENT cette demande ?');
    setConfirmDetails([
      'Cette action est IRRÉVERSIBLE',
      'Toutes les données associées seront supprimées',
      'Recommandation : Utilisez plutôt "Archiver" pour conserver l\'historique',
    ]);
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`/api/admin/contacts/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          if (showToast) {
            showToast(data.error || 'Erreur lors de la suppression', 'error');
          }
          return;
        }

        if (showToast) {
          showToast('Demande supprimée avec succès', 'success');
        }
        await loadContacts();
      } catch (error: any) {
        console.error('Erreur:', error);
        if (showToast) {
          showToast('Erreur serveur', 'error');
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      NEW: { label: 'Nouveau', className: 'badge-new' },
      PROCESSED: { label: 'Traité', className: 'badge-processed' },
      ARCHIVED: { label: 'Archivé', className: 'badge-archived' },
    };

    const badge = badges[status] || { label: status, className: '' };
    return <span class={`badge ${badge.className}`}>{badge.label}</span>;
  };

  return (
    <div>
      <ToastContainer onToastEmit={handleToastEmit} />

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
                <option value="NEW">Nouveau</option>
                <option value="PROCESSED">Traité</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>

            {/* Filtre Type */}
            <div>
              <label for="filter-type" class="block text-sm font-medium text-[var(--color-anjou-brown)] mb-2">
                Type
              </label>
              <select
                id="filter-type"
                class="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter((e.target as HTMLSelectElement).value)}
              >
                <option value="">Tous les types</option>
                <option value="contact">Contact simple</option>
                <option value="booking">Demande réservation</option>
              </select>
            </div>

            {/* Bouton Rafraîchir */}
            <div class="flex items-end">
              <button onClick={loadContacts} class="refresh-button">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Rafraîchir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des contacts */}
      <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden">
        <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5"></div>

        {/* Loading state */}
        {loading && (
          <div class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--color-anjou-gold)] border-t-transparent"></div>
            <p class="text-[var(--color-anjou-olive)] mt-4">Chargement des contacts...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && contacts.length === 0 && (
          <div class="p-8 text-center">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="text-gray-500 text-lg">Aucune demande de contact</p>
          </div>
        )}

        {/* Table */}
        {!loading && contacts.length > 0 && (
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-[var(--color-anjou-beige)]/30">
                <tr>
                  <th class="table-header">Date</th>
                  <th class="table-header">Nom</th>
                  <th class="table-header">Email</th>
                  <th class="table-header">Téléphone</th>
                  <th class="table-header">Type</th>
                  <th class="table-header">Statut</th>
                  <th class="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <>
                    {/* Main row */}
                    <tr key={contact.id} class="table-row">
                      <td class="table-cell">{formatDate(contact.createdAt)}</td>
                      <td class="table-cell font-medium">{contact.nom}</td>
                      <td class="table-cell">
                        <a
                          href={`mailto:${contact.email}`}
                          class="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.email}
                        </a>
                      </td>
                      <td class="table-cell">
                        <a
                          href={`tel:${contact.telephone}`}
                          class="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.telephone}
                        </a>
                      </td>
                      <td class="table-cell">
                        {contact.isBooking ? (
                          <span class="badge badge-booking">Réservation</span>
                        ) : (
                          <span class="badge">Contact</span>
                        )}
                      </td>
                      <td class="table-cell">{getStatusBadge(contact.status)}</td>
                      <td class="table-cell" onClick={(e) => e.stopPropagation()}>
                        <div class="flex space-x-3">
                          {/* Bouton Voir */}
                          <button
                            class="action-btn btn-view"
                            onClick={() => toggleMessageRow(contact.id)}
                            title="Voir le message"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                          </button>

                          {/* Bouton Traiter (si status = NEW) */}
                          {contact.status === 'NEW' && (
                            <button
                              class="action-btn btn-process"
                              onClick={() => handleUpdateStatus(contact.id, 'PROCESSED')}
                              title="Marquer comme traité"
                              style="font-size: 1.125rem;"
                            >
                              ✓
                            </button>
                          )}

                          {/* Bouton Archiver (si status != ARCHIVED) */}
                          {contact.status !== 'ARCHIVED' && (
                            <button
                              class="action-btn btn-archive"
                              onClick={() => handleUpdateStatus(contact.id, 'ARCHIVED')}
                              title="Archiver"
                              style="font-size: 1.125rem;"
                            >
                              📦
                            </button>
                          )}

                          {/* Bouton Supprimer */}
                          <button
                            class="action-btn btn-delete"
                            onClick={() => handleDeleteContact(contact.id)}
                            title="Supprimer définitivement"
                            style="font-size: 1.125rem;"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable details row */}
                    {expandedRowId === contact.id && (
                      <tr class="message-details-row">
                        <td colspan="7" class="message-details-cell">
                          <div class="message-details-content">
                            <div class="message-header">
                              <h3 class="message-title">💬 Message</h3>
                              <button
                                onClick={() => toggleMessageRow(contact.id)}
                                class="message-close-btn"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                            <div class="message-content">{contact.message}</div>
                            {contact.isBooking && contact.bookingData && (
                              <div class="booking-data-section">
                                <h4 class="booking-data-title">📋 Données de réservation</h4>
                                <div class="booking-data-grid">
                                  {Object.entries(contact.bookingData).map(([key, value]) => (
                                    <div class="booking-data-item" key={key}>
                                      <span class="booking-data-key">{key}</span>
                                      <span class="booking-data-value">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
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

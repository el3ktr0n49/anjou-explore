import { h } from 'preact';

interface ReservationFiltersProps {
  paymentStatus: string;
  eventId: string;
  archived: string;
  events: Array<{ id: string; name: string }>;
  onPaymentStatusChange: (value: string) => void;
  onEventChange: (value: string) => void;
  onArchivedChange: (value: string) => void;
  onRefresh: () => void;
}

export default function ReservationFilters({
  paymentStatus,
  eventId,
  archived,
  events,
  onPaymentStatusChange,
  onEventChange,
  onArchivedChange,
  onRefresh,
}: ReservationFiltersProps) {
  return (
    <div class="bg-white rounded-xl shadow-md border border-[var(--color-anjou-beige)]/50 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Statut paiement */}
        <div>
          <label class="form-label">Statut paiement</label>
          <select
            class="form-input"
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange((e.target as HTMLSelectElement).value)}
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="PAID">Payé</option>
            <option value="FAILED">Échoué</option>
            <option value="REFUNDED">Remboursé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        {/* Événement */}
        <div>
          <label class="form-label">Événement</label>
          <select
            class="form-input"
            value={eventId}
            onChange={(e) => onEventChange((e.target as HTMLSelectElement).value)}
          >
            <option value="">Tous</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Archivage */}
        <div>
          <label class="form-label">Archivage</label>
          <select
            class="form-input"
            value={archived}
            onChange={(e) => onArchivedChange((e.target as HTMLSelectElement).value)}
          >
            <option value="false">✓ Actives</option>
            <option value="true">Archivées</option>
            <option value="all">Toutes</option>
          </select>
        </div>

        {/* Bouton rafraîchir */}
        <div class="flex items-end">
          <button
            onClick={onRefresh}
            class="w-full px-4 py-2 bg-[var(--color-anjou-olive)] text-white rounded-lg hover:bg-[var(--color-anjou-brown)] transition font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Rafraîchir
          </button>
        </div>
      </div>
    </div>
  );
}

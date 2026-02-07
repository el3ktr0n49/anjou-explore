import { h } from 'preact';
import type { EventSummary } from '../../types';

interface Props {
  events: EventSummary[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouvert',
  CLOSED: 'Fermé',
  ARCHIVED: 'Archivé',
};

export default function EventSelector({ events, selectedEventId, onSelect }: Props) {
  return (
    <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden mb-8">
      <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5" />
      <div class="p-6">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <svg
              class="w-6 h-6 text-[var(--color-anjou-gold)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 class="text-xl font-serif text-[var(--color-anjou-brown)]">
              Statistiques par événement
            </h2>
          </div>
          <select
            class="filter-select"
            value={selectedEventId}
            onChange={(e) => onSelect((e.target as HTMLSelectElement).value)}
          >
            <option value="">-- Sélectionner un événement --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({STATUS_LABELS[event.status] || event.status}) —{' '}
                {new Date(event.date).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

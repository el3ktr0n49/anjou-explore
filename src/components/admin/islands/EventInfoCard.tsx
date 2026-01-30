import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Event } from '../types';

interface EventInfoCardProps {
  event: Event;
  onUpdate: (data: Partial<Event>) => Promise<void>;
}

export default function EventInfoCard({ event: initialEvent, onUpdate }: EventInfoCardProps) {
  const [event, setEvent] = useState(initialEvent);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialEvent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync event when initialEvent changes (after update)
  useEffect(() => {
    setEvent(initialEvent);
    setFormData(initialEvent);
  }, [initialEvent]);

  const handleEdit = () => {
    setFormData(event);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(event);
    setIsEditing(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onUpdate(formData);
      setEvent(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string): h.JSX.Element => {
    const badges: Record<string, { label: string; class: string }> = {
      DRAFT: { label: 'Brouillon', class: 'badge-draft' },
      OPEN: { label: 'Ouvert', class: 'badge-open' },
      CLOSED: { label: 'Fermé', class: 'badge-closed' },
      ARCHIVED: { label: 'Archivé', class: 'badge-archived' },
    };

    const badge = badges[status] || { label: status, class: 'badge-draft' };
    return <span class={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden">
      <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5" />
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-serif text-[var(--color-anjou-brown)] flex items-center">
            <svg class="w-6 h-6 mr-2 text-[var(--color-anjou-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Informations générales
          </h2>
          {!isEditing && (
            <button
              onClick={handleEdit}
              class="px-4 py-2 bg-[var(--color-anjou-gold)] text-white rounded-lg hover:shadow-lg transition font-medium text-sm"
            >
              ✏️ Modifier
            </button>
          )}
        </div>

        {!isEditing ? (
          /* Display Mode */
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="form-label">Nom</p>
              <p class="field-value">{event.name}</p>
            </div>

            <div>
              <p class="form-label">Slug</p>
              <p class="field-value">{event.slug}</p>
            </div>

            <div>
              <p class="form-label">Date</p>
              <p class="field-value">{formatDate(event.date)}</p>
            </div>

            <div>
              <p class="form-label">Statut</p>
              <p class="field-value">{getStatusBadge(event.status)}</p>
            </div>

            <div>
              <p class="form-label">Paiements</p>
              <p class="field-value">{event.paymentEnabled ? '✅ Activés' : '❌ Désactivés'}</p>
            </div>

            <div>
              <p class="form-label">Date limite d'inscription</p>
              <p class="field-value">{event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Non définie'}</p>
            </div>

            <div>
              <p class="form-label">Override inscription</p>
              <p class="field-value">
                {event.registrationOpenOverride === null
                  ? 'Auto'
                  : event.registrationOpenOverride
                    ? 'Forcer ouvert'
                    : 'Forcer fermé'}
              </p>
            </div>

            <div>
              <p class="form-label">Lieu</p>
              <p class="field-value">{event.location || 'Non défini'}</p>
            </div>

            <div class="md:col-span-2">
              <p class="form-label">Description</p>
              <p class="field-value">{event.description || 'Aucune description'}</p>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit} class="space-y-6">
            {/* Edit Mode Indicator */}
            <div class="edit-mode-indicator">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p>Mode édition - Modifiez les champs puis cliquez sur "Enregistrer"</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="form-label">Nom</label>
                <input
                  type="text"
                  class="form-input"
                  value={formData.name}
                  onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div>
                <label class="form-label">Slug</label>
                <input
                  type="text"
                  class="form-input"
                  value={formData.slug}
                  onInput={(e) => handleInputChange('slug', (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div>
                <label class="form-label">Date</label>
                <input
                  type="date"
                  class="form-input"
                  value={formData.date.split('T')[0]}
                  onInput={(e) => handleInputChange('date', new Date((e.target as HTMLInputElement).value).toISOString())}
                  required
                />
              </div>

              <div>
                <label class="form-label">Statut</label>
                <select
                  class="form-input"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', (e.target as HTMLSelectElement).value)}
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="OPEN">Ouvert</option>
                  <option value="CLOSED">Fermé</option>
                  <option value="ARCHIVED">Archivé</option>
                </select>
              </div>

              <div>
                <label class="form-label">Paiements activés</label>
                <select
                  class="form-input"
                  value={formData.paymentEnabled ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('paymentEnabled', (e.target as HTMLSelectElement).value === 'true')}
                >
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>

              <div>
                <label class="form-label">Date limite d'inscription</label>
                <input
                  type="date"
                  class="form-input"
                  value={formData.registrationDeadline ? formData.registrationDeadline.split('T')[0] : ''}
                  onInput={(e) =>
                    handleInputChange(
                      'registrationDeadline',
                      (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value).toISOString() : null
                    )
                  }
                />
              </div>

              <div>
                <label class="form-label">Override inscription</label>
                <select
                  class="form-input"
                  value={formData.registrationOpenOverride === null ? 'null' : formData.registrationOpenOverride.toString()}
                  onChange={(e) => {
                    const value = (e.target as HTMLSelectElement).value;
                    handleInputChange('registrationOpenOverride', value === 'null' ? null : value === 'true');
                  }}
                >
                  <option value="null">Auto</option>
                  <option value="true">Forcer ouvert</option>
                  <option value="false">Forcer fermé</option>
                </select>
              </div>

              <div>
                <label class="form-label">Lieu</label>
                <input
                  type="text"
                  class="form-input"
                  value={formData.location || ''}
                  onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value || null)}
                />
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Description</label>
                <textarea
                  class="form-input"
                  rows={4}
                  value={formData.description || ''}
                  onInput={(e) => handleInputChange('description', (e.target as HTMLTextAreaElement).value || null)}
                />
              </div>
            </div>

            <div class="flex justify-end gap-4 mt-8 pt-6 border-t-2 border-[var(--color-anjou-beige)]">
              <button type="button" onClick={handleCancel} class="btn-secondary px-6 py-2.5" disabled={isSubmitting}>
                ✕ Annuler
              </button>
              <button type="submit" class="btn-primary px-6 py-2.5" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

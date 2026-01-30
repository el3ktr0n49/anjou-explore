import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import ActivityCard from './ActivityCard';
import type { Activity, Pricing } from '../types';

interface ActivitiesManagerProps {
  eventId: string;
  initialActivities: Activity[];
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onReload: () => Promise<void>;
}

interface ActivityFormData {
  name: string;
  description: string;
  maxParticipants: string;
}

interface PricingFormData {
  priceType: string;
  label: string;
  price: string;
}

export default function ActivitiesManager({
  eventId,
  initialActivities,
  onShowToast,
  onReload,
}: ActivitiesManagerProps) {
  const [activities, setActivities] = useState(initialActivities);

  // Sync activities when initialActivities changes (after reload)
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    name: '',
    description: '',
    maxParticipants: '',
  });

  // Pricing Modal state
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  const [pricingForm, setPricingForm] = useState<PricingFormData>({
    priceType: '',
    label: '',
    price: '',
  });

  // Confirm Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmDetails, setConfirmDetails] = useState<string[]>([]);

  // ========================================
  // Activity CRUD
  // ========================================

  const openActivityModal = (activityId?: string) => {
    if (activityId) {
      const activity = activities.find((a) => a.id === activityId);
      if (activity) {
        setEditingActivityId(activityId);
        setActivityForm({
          name: activity.name,
          description: activity.description || '',
          maxParticipants: activity.maxParticipants?.toString() || '',
        });
      }
    } else {
      setEditingActivityId(null);
      setActivityForm({ name: '', description: '', maxParticipants: '' });
    }
    setIsActivityModalOpen(true);
  };

  const closeActivityModal = () => {
    setIsActivityModalOpen(false);
    setEditingActivityId(null);
    setActivityForm({ name: '', description: '', maxParticipants: '' });
  };

  const handleActivitySubmit = async (e: any) => {
    e.preventDefault();

    const data = {
      name: activityForm.name,
      description: activityForm.description || undefined,
      maxParticipants: activityForm.maxParticipants ? parseInt(activityForm.maxParticipants) : undefined,
    };

    try {
      const url = editingActivityId
        ? `/api/admin/events/${eventId}/activities/${editingActivityId}`
        : `/api/admin/events/${eventId}/activities`;

      const response = await fetch(url, {
        method: editingActivityId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la sauvegarde');
      }

      onShowToast(editingActivityId ? 'Activité mise à jour avec succès' : 'Activité créée avec succès', 'success');
      await onReload();
      closeActivityModal();
    } catch (error: any) {
      console.error('Error:', error);
      onShowToast(error.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteActivity = (activityId: string, activityName: string) => {
    setConfirmMessage(`Voulez-vous vraiment supprimer l'activité "${activityName}" ?`);
    setConfirmDetails(['Tous les tarifs associés', 'Les données ne pourront pas être récupérées']);
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}/activities/${activityId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la suppression');
        }

        onShowToast('Activité supprimée avec succès', 'success');
        await onReload();
      } catch (error: any) {
        console.error('Error:', error);
        onShowToast(error.message || 'Erreur lors de la suppression', 'error');
      }
    });
    setIsConfirmOpen(true);
  };

  // ========================================
  // Pricing CRUD
  // ========================================

  const openPricingModal = (activityId: string) => {
    setCurrentActivityId(activityId);
    setPricingForm({ priceType: '', label: '', price: '' });
    setIsPricingModalOpen(true);
  };

  const closePricingModal = () => {
    setIsPricingModalOpen(false);
    setCurrentActivityId(null);
    setPricingForm({ priceType: '', label: '', price: '' });
  };

  const handlePricingSubmit = async (e: any) => {
    e.preventDefault();

    if (!currentActivityId) return;

    const data = {
      priceType: pricingForm.priceType,
      label: pricingForm.label,
      price: parseFloat(pricingForm.price),
    };

    try {
      const response = await fetch(`/api/admin/events/${eventId}/activities/${currentActivityId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }

      onShowToast('Tarif créé avec succès', 'success');
      await onReload();
      closePricingModal();
    } catch (error: any) {
      console.error('Error:', error);
      onShowToast(error.message || 'Erreur lors de la création', 'error');
    }
  };

  const handleDeletePricing = (pricingId: string, label: string) => {
    setConfirmMessage(`Voulez-vous vraiment supprimer le tarif "${label}" ?`);
    setConfirmDetails([]);
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}/pricing/${pricingId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la suppression');
        }

        onShowToast('Tarif supprimé avec succès', 'success');
        await onReload();
      } catch (error: any) {
        console.error('Error:', error);
        onShowToast(error.message || 'Erreur lors de la suppression', 'error');
      }
    });
    setIsConfirmOpen(true);
  };

  // ========================================
  // Confirm Dialog
  // ========================================

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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Activités & Tarifs
          </h2>
          <button
            onClick={() => openActivityModal()}
            class="px-4 py-2 bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] text-white rounded-lg hover:shadow-lg transition font-medium text-sm"
          >
            ➕ Nouvelle activité
          </button>
        </div>

        {/* Activities list */}
        <div class="space-y-6">
          {activities.length === 0 ? (
            <div class="text-center py-12">
              <svg
                class="mx-auto h-12 w-12 text-[var(--color-anjou-olive)]/30 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <p class="text-sm text-[var(--color-anjou-olive)]">Aucune activité pour cet événement</p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={() => openActivityModal(activity.id)}
                onDelete={() => handleDeleteActivity(activity.id, activity.name)}
                onAddPricing={() => openPricingModal(activity.id)}
                onDeletePricing={handleDeletePricing}
              />
            ))
          )}
        </div>
      </div>

      {/* Activity Modal */}
      <Modal isOpen={isActivityModalOpen} onClose={closeActivityModal} title={editingActivityId ? 'Modifier l\'activité' : 'Nouvelle activité'}>
        <form onSubmit={handleActivitySubmit} class="space-y-4">
          <div>
            <label class="form-label">Nom de l'activité</label>
            <input
              type="text"
              class="form-input"
              placeholder="Ex: rando papilles"
              value={activityForm.name}
              onInput={(e) => setActivityForm({ ...activityForm, name: (e.target as HTMLInputElement).value })}
              required
            />
          </div>

          <div>
            <label class="form-label">Description (optionnel)</label>
            <textarea
              class="form-input"
              rows={3}
              placeholder="Description de l'activité"
              value={activityForm.description}
              onInput={(e) => setActivityForm({ ...activityForm, description: (e.target as HTMLTextAreaElement).value })}
            />
          </div>

          <div>
            <label class="form-label">Nombre maximum de participants (optionnel)</label>
            <input
              type="number"
              class="form-input"
              min="1"
              placeholder="Ex: 50"
              value={activityForm.maxParticipants}
              onInput={(e) => setActivityForm({ ...activityForm, maxParticipants: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div class="modal-footer">
            <button type="button" onClick={closeActivityModal} class="btn-secondary">
              Annuler
            </button>
            <button type="submit" class="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Pricing Modal */}
      <Modal isOpen={isPricingModalOpen} onClose={closePricingModal} title="Nouveau tarif">
        <form onSubmit={handlePricingSubmit} class="space-y-4">
          <div>
            <label class="form-label">Type de tarif</label>
            <input
              type="text"
              class="form-input"
              placeholder="Ex: adulte, enfant"
              value={pricingForm.priceType}
              onInput={(e) => setPricingForm({ ...pricingForm, priceType: (e.target as HTMLInputElement).value })}
              required
            />
          </div>

          <div>
            <label class="form-label">Libellé</label>
            <input
              type="text"
              class="form-input"
              placeholder="Ex: Adulte (+16 ans)"
              value={pricingForm.label}
              onInput={(e) => setPricingForm({ ...pricingForm, label: (e.target as HTMLInputElement).value })}
              required
            />
          </div>

          <div>
            <label class="form-label">Prix (€)</label>
            <input
              type="number"
              class="form-input"
              step="0.01"
              min="0"
              placeholder="Ex: 45.00"
              value={pricingForm.price}
              onInput={(e) => setPricingForm({ ...pricingForm, price: (e.target as HTMLInputElement).value })}
              required
            />
          </div>

          <div class="modal-footer">
            <button type="button" onClick={closePricingModal} class="btn-secondary">
              Annuler
            </button>
            <button type="submit" class="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

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

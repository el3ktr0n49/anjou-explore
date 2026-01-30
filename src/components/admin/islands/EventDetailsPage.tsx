import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ToastContainer from '../ui/ToastContainer';
import EventInfoCard from './EventInfoCard';
import ActivitiesManager from './ActivitiesManager';
import StatsCard from './StatsCard';
import type { Event, ToastType } from '../types';

interface EventDetailsPageProps {
  eventId: string;
}

export default function EventDetailsPage({ eventId }: EventDetailsPageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState<((message: string, type: ToastType) => void) | null>(null);

  // Load event data
  const loadEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'événement');
      }

      const data = await response.json();
      setEvent(data.event);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading event:', error);
      if (showToast) {
        showToast('Erreur lors du chargement de l\'événement', 'error');
      }
      setTimeout(() => {
        window.location.href = '/admin/events';
      }, 2000);
    }
  }, [eventId, showToast]);

  // Update event
  const handleUpdateEvent = async (data: Partial<Event>) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      if (showToast) {
        showToast('Événement mis à jour avec succès', 'success');
      }
      await loadEvent();
    } catch (error: any) {
      console.error('Error updating event:', error);
      if (showToast) {
        showToast(error.message || 'Erreur lors de la mise à jour', 'error');
      }
      throw error;
    }
  };

  // Reload event (for activities/pricing updates)
  const handleReload = async () => {
    await loadEvent();
  };

  // Toast callback
  const handleToastEmit = (toastFn: (message: string, type: ToastType) => void) => {
    setShowToast(() => toastFn);
  };

  // Initial load
  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

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
          <span class="text-lg font-medium">Chargement de l'événement...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <>
      <ToastContainer onToastEmit={handleToastEmit} />

      <div class="space-y-8">
        {/* Event Information Card */}
        <EventInfoCard event={event} onUpdate={handleUpdateEvent} />

        {/* Activities Manager */}
        <ActivitiesManager
          eventId={eventId}
          initialActivities={event.activities}
          onShowToast={(msg, type) => showToast && showToast(msg, type)}
          onReload={handleReload}
        />

        {/* Stats Card */}
        <StatsCard event={event} />
      </div>
    </>
  );
}

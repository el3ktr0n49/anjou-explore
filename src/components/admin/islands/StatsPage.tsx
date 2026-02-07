import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ToastContainer from '../ui/ToastContainer';
import GlobalKPICards from './stats/GlobalKPICards';
import EventSelector from './stats/EventSelector';
import EventKPICards from './stats/EventKPICards';
import ParticipantsChart from './stats/ParticipantsChart';
import PaymentStatusChart from './stats/PaymentStatusChart';
import InscriptionsTimelineChart from './stats/InscriptionsTimelineChart';
import RevenueChart from './stats/RevenueChart';
import ParticipantsBreakdownTable from './stats/ParticipantsBreakdownTable';
import type {
  GlobalKPIs,
  EventSummary,
  EventStatsData,
  ToastType,
} from '../types';

export default function StatsPage() {
  // Global state
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalKpis, setGlobalKpis] = useState<GlobalKPIs | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);

  // Event-specific state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventStats, setEventStats] = useState<EventStatsData | null>(null);

  // Toast
  const [showToast, setShowToast] = useState<((msg: string, type: ToastType) => void) | null>(null);
  const handleToastEmit = useCallback(
    (toastFn: (msg: string, type: ToastType) => void) => {
      setShowToast(() => toastFn);
    },
    []
  );

  // Charger les KPIs globaux + liste événements
  const loadGlobal = useCallback(async () => {
    try {
      setGlobalLoading(true);
      const response = await fetch('/api/admin/stats/detailed', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Erreur chargement stats');

      const data = await response.json();
      setGlobalKpis(data.global);
      setEvents(data.events);
    } catch (error) {
      if (showToast) showToast('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setGlobalLoading(false);
    }
  }, [showToast]);

  // Charger les stats d'un événement
  const loadEventStats = useCallback(
    async (eventId: string) => {
      if (!eventId) {
        setEventStats(null);
        return;
      }

      try {
        setEventLoading(true);
        const response = await fetch(`/api/admin/stats/detailed?eventId=${eventId}`, {
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Erreur chargement stats événement');

        const data: EventStatsData = await response.json();
        setEventStats(data);
      } catch (error) {
        if (showToast) showToast('Erreur lors du chargement des stats événement', 'error');
        setEventStats(null);
      } finally {
        setEventLoading(false);
      }
    },
    [showToast]
  );

  // Chargement initial
  useEffect(() => {
    loadGlobal();
  }, [loadGlobal]);

  // Charger les stats quand on change d'événement
  const handleEventSelect = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId);
      loadEventStats(eventId);
    },
    [loadEventStats]
  );

  return (
    <div>
      <ToastContainer onToastEmit={handleToastEmit} />

      {/* Section 1 : KPIs Globaux */}
      {globalLoading ? (
        <div class="flex items-center justify-center py-12">
          <div class="loading-spinner" />
          <span class="ml-3 text-[var(--color-anjou-olive)]">Chargement des statistiques...</span>
        </div>
      ) : (
        <>
          {globalKpis && <GlobalKPICards kpis={globalKpis} />}

          {/* Section 2 : Sélecteur d'événement */}
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            onSelect={handleEventSelect}
          />

          {/* Section 3 : Stats événement */}
          {selectedEventId && (
            <>
              {eventLoading ? (
                <div class="flex items-center justify-center py-12">
                  <div class="loading-spinner" />
                  <span class="ml-3 text-[var(--color-anjou-olive)]">
                    Chargement des statistiques...
                  </span>
                </div>
              ) : eventStats ? (
                <div class="space-y-8">
                  {/* KPIs événement */}
                  <EventKPICards kpis={eventStats.kpis} />

                  {/* Graphiques - grille 2x2 sur desktop */}
                  <div class="charts-grid">
                    <ParticipantsChart activitiesBreakdown={eventStats.activitiesBreakdown} />
                    <PaymentStatusChart paymentDistribution={eventStats.paymentDistribution} />
                    <RevenueChart activitiesBreakdown={eventStats.activitiesBreakdown} />
                  </div>

                  {/* Timeline pleine largeur */}
                  <InscriptionsTimelineChart
                    inscriptionsTimeline={eventStats.inscriptionsTimeline}
                  />

                  {/* Tableau détail participants */}
                  <ParticipantsBreakdownTable
                    activitiesBreakdown={eventStats.activitiesBreakdown}
                  />
                </div>
              ) : (
                <div class="text-center py-12 text-gray-500">
                  <svg
                    class="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <p>Aucune donnée disponible pour cet événement</p>
                </div>
              )}
            </>
          )}

          {/* Message si aucun événement sélectionné */}
          {!selectedEventId && (
            <div class="text-center py-16 text-gray-400">
              <svg
                class="w-20 h-20 mx-auto mb-4 text-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-lg">Sélectionnez un événement pour voir les statistiques détaillées</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

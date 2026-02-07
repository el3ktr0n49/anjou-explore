import { h } from 'preact';
import type { EventKPIs } from '../../types';

interface Props {
  kpis: EventKPIs;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function EventKPICards({ kpis }: Props) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Participants */}
      <div class="kpi-card">
        <div class="kpi-icon bg-[var(--color-anjou-beige)]">
          <svg
            class="w-6 h-6 text-[var(--color-anjou-brown)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Participants</p>
          <p class="kpi-value">{kpis.totalParticipants}</p>
          <p class="kpi-sub">{kpis.totalReservations} réservation{kpis.totalReservations > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Revenus payés */}
      <div class="kpi-card">
        <div class="kpi-icon bg-green-100">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Revenus payés</p>
          <p class="kpi-value text-green-700">{formatEuro(kpis.revenuePaid)}</p>
          {kpis.revenuePending > 0 && (
            <p class="kpi-sub">{formatEuro(kpis.revenuePending)} en attente</p>
          )}
        </div>
      </div>

      {/* Revenu total (payé + pending) */}
      <div class="kpi-card">
        <div class="kpi-icon bg-amber-100">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Revenu total</p>
          <p class="kpi-value text-amber-700">{formatEuro(kpis.revenuePaid + kpis.revenuePending)}</p>
          <p class="kpi-sub">Payé + En attente</p>
        </div>
      </div>

      {/* Taux de remplissage */}
      <div class="kpi-card">
        <div class="kpi-icon bg-blue-100">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Remplissage</p>
          <p class="kpi-value text-blue-700">
            {kpis.fillRate !== null ? `${kpis.fillRate}%` : '—'}
          </p>
          <p class="kpi-sub">{kpis.fillRate !== null ? 'Des places occupées' : 'Pas de limite'}</p>
        </div>
      </div>
    </div>
  );
}

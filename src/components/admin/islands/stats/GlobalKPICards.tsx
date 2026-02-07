import { h } from 'preact';
import type { GlobalKPIs } from '../../types';

interface Props {
  kpis: GlobalKPIs;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function GlobalKPICards({ kpis }: Props) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Revenus payés */}
      <div class="kpi-card">
        <div class="kpi-icon bg-green-100">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Revenus encaissés</p>
          <p class="kpi-value text-green-700">{formatEuro(kpis.revenuePaid)}</p>
          <p class="kpi-sub">{new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Revenus en attente */}
      <div class="kpi-card">
        <div class="kpi-icon bg-amber-100">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">En attente</p>
          <p class="kpi-value text-amber-700">{formatEuro(kpis.revenuePending)}</p>
          <p class="kpi-sub">{new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Taux de conversion */}
      <div class="kpi-card">
        <div class="kpi-icon bg-blue-100">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Taux de conversion</p>
          <p class="kpi-value text-blue-700">{kpis.conversionRate}%</p>
          <p class="kpi-sub">Payé / Total</p>
        </div>
      </div>

      {/* Contacts en attente */}
      <div class="kpi-card">
        <div class="kpi-icon bg-purple-100">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <p class="kpi-label">Contacts en attente</p>
          <p class="kpi-value text-purple-700">{kpis.contactsNew}</p>
          <p class="kpi-sub">Non traités</p>
        </div>
      </div>
    </div>
  );
}

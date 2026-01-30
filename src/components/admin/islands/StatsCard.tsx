import { h } from 'preact';
import type { Event } from '../types';

interface StatsCardProps {
  event: Event;
}

export default function StatsCard({ event }: StatsCardProps) {
  // Calculate global stats
  let totalParticipants = 0;
  let totalRevenue = 0;
  const totalReservations = event.reservations.length;

  event.reservations.forEach((reservation) => {
    const participants = reservation.participants as Record<string, number>;
    const count = Object.values(participants).reduce((sum, qty) => sum + qty, 0);
    totalParticipants += count;

    if (reservation.paymentStatus === 'PAID') {
      totalRevenue += Number(reservation.amount);
    }
  });

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  return (
    <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden">
      <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5" />
      <div class="p-8">
        <h2 class="text-2xl font-serif text-[var(--color-anjou-brown)] mb-6 flex items-center">
          <svg class="w-6 h-6 mr-2 text-[var(--color-anjou-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Statistiques
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="stat-card">
            <p class="stat-value">{totalReservations}</p>
            <p class="stat-label">Réservations</p>
          </div>

          <div class="stat-card">
            <p class="stat-value">{totalParticipants}</p>
            <p class="stat-label">Participants inscrits</p>
          </div>

          <div class="stat-card">
            <p class="stat-value">{formatPrice(totalRevenue)}€</p>
            <p class="stat-label">Revenus payés</p>
          </div>
        </div>
      </div>
    </div>
  );
}

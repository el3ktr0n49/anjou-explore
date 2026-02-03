/**
 * Types partagés pour les composants admin
 */

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  date: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
  paymentEnabled: boolean;
  registrationDeadline: string | null;
  registrationOpenOverride: boolean | null;
  location: string | null;
  partnerLogo: string | null;
  activities: Activity[];
  reservations: Reservation[];
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number | null;
  pricing: Pricing[];
  stats?: ActivityStats;
}

export interface Pricing {
  id: string;
  priceType: string;
  label: string;
  price: string;
}

export interface Reservation {
  id: string;
  participants: Record<string, number>;
  activityName: string;
  paymentStatus: string;
  amount: string;
}

export interface ActivityStats {
  totalParticipants: number;
  placesRestantes: number | null;
  totalRevenue: number;
  reservationsCount: number;
}

export type ToastType = 'success' | 'error' | 'info';

// ========================================
// Reservations Page Types
// ========================================

export interface PaymentTransaction {
  id: string;
  checkoutId: string;
  transactionId?: string;
  amount: number;
  status: 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

export interface ReservationEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
}

export interface ReservationFull {
  id: string;
  groupId?: string | null;
  eventId: string;
  event: ReservationEvent;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  activityName: string;
  participants: Record<string, number>;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  sumupCheckoutId?: string;
  sumupTransactionId?: string;
  paidAt?: string;
  notes?: string;
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  paymentTransactions: PaymentTransaction[];
  createdAt: string;
  updatedAt: string;
}

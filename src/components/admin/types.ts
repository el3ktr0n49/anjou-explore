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

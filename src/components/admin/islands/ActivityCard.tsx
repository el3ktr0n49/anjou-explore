import { h } from 'preact';
import type { Activity } from '../types';

interface ActivityCardProps {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onAddPricing: () => void;
  onDeletePricing: (pricingId: string, label: string) => void;
}

export default function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onAddPricing,
  onDeletePricing,
}: ActivityCardProps) {
  const formatPrice = (price: string): string => {
    return parseFloat(price).toFixed(2);
  };

  return (
    <div class="activity-card">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-[var(--color-anjou-brown)] mb-1">{activity.name}</h3>
          {activity.description && (
            <p class="text-sm text-[var(--color-anjou-olive)] mb-2">{activity.description}</p>
          )}
          <div class="flex items-center gap-4 text-sm">
            <span class="text-[var(--color-anjou-olive)]">Max: {activity.maxParticipants || 'Illimité'}</span>
            {activity.stats && (
              <>
                <span class="text-[var(--color-anjou-olive)]">Inscrits: {activity.stats.totalParticipants}</span>
                {activity.stats.placesRestantes !== null && (
                  <span class="text-[var(--color-anjou-olive)]">Restantes: {activity.stats.placesRestantes}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div class="flex gap-2">
          <button
            onClick={onEdit}
            class="px-3 py-1.5 text-sm bg-[var(--color-anjou-beige)]/50 hover:bg-[var(--color-anjou-beige)] text-[var(--color-anjou-brown)] rounded-lg transition cursor-pointer"
            title="Modifier"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            class="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div class="border-t border-[var(--color-anjou-beige)] pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-[var(--color-anjou-brown)]">Tarifs</h4>
          <button
            onClick={onAddPricing}
            class="text-xs px-3 py-1 bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] text-white rounded-lg hover:shadow-lg transition cursor-pointer"
          >
            ➕ Ajouter tarif
          </button>
        </div>

        {activity.pricing.length === 0 ? (
          <p class="text-sm text-[var(--color-anjou-olive)]">Aucun tarif défini</p>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activity.pricing.map((price) => (
              <div key={price.id} class="flex items-center justify-between bg-[var(--color-anjou-beige)]/30 rounded-lg p-3">
                <div class="flex-1">
                  <p class="text-sm font-medium text-[var(--color-anjou-brown)]">{price.label}</p>
                  <p class="text-xs text-[var(--color-anjou-olive)]">{price.priceType}</p>
                </div>
                <div class="flex items-center gap-2">
                  <p class="text-lg font-bold text-[var(--color-anjou-brown)]">{formatPrice(price.price)}€</p>
                  <button
                    onClick={() => onDeletePricing(price.id, price.label)}
                    class="text-red-500 hover:text-red-700 transition cursor-pointer"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { h } from 'preact';
import type { ActivityBreakdown } from '../../types';

interface Props {
  activitiesBreakdown: ActivityBreakdown[];
}

export default function ParticipantsBreakdownTable({ activitiesBreakdown }: Props) {
  if (activitiesBreakdown.length === 0) return null;

  // Collecter tous les types de participants uniques
  const allTypes = new Set<string>();
  for (const activity of activitiesBreakdown) {
    for (const type of Object.keys(activity.participantsByType)) {
      allTypes.add(type);
    }
  }
  const types = Array.from(allTypes).sort();

  if (types.length === 0) {
    return null;
  }

  // Capitaliser le premier caractère
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div class="bg-white rounded-2xl shadow-lg border border-[var(--color-anjou-beige)]/50 overflow-hidden">
      <div class="bg-gradient-to-r from-[var(--color-anjou-gold)] to-[var(--color-anjou-olive)] h-1.5" />
      <div class="p-6">
        <h3 class="text-lg font-serif text-[var(--color-anjou-brown)] mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-[var(--color-anjou-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Détail des participants
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-[var(--color-anjou-beige)]">
                <th class="text-left py-3 px-3 font-semibold text-[var(--color-anjou-brown)]">
                  Activité
                </th>
                {types.map((type) => (
                  <th
                    key={type}
                    class="text-center py-3 px-3 font-semibold text-[var(--color-anjou-brown)]"
                  >
                    {capitalize(type)}
                  </th>
                ))}
                <th class="text-center py-3 px-3 font-semibold text-[var(--color-anjou-brown)]">
                  Total
                </th>
                <th class="text-center py-3 px-3 font-semibold text-[var(--color-anjou-brown)]">
                  Max
                </th>
                <th class="text-center py-3 px-3 font-semibold text-[var(--color-anjou-brown)]">
                  Taux
                </th>
              </tr>
            </thead>
            <tbody>
              {activitiesBreakdown.map((activity, idx) => {
                const fillRate =
                  activity.maxParticipants !== null
                    ? Math.round((activity.totalParticipants / activity.maxParticipants) * 100)
                    : null;

                return (
                  <tr
                    key={activity.activityId}
                    class={idx % 2 === 0 ? 'bg-white' : 'bg-[var(--color-anjou-beige)]/10'}
                  >
                    <td class="py-3 px-3 font-medium text-[var(--color-anjou-brown)]">
                      {activity.activityName}
                    </td>
                    {types.map((type) => (
                      <td key={type} class="text-center py-3 px-3 text-gray-700">
                        {activity.participantsByType[type] || 0}
                      </td>
                    ))}
                    <td class="text-center py-3 px-3 font-semibold text-[var(--color-anjou-brown)]">
                      {activity.totalParticipants}
                    </td>
                    <td class="text-center py-3 px-3 text-gray-500">
                      {activity.maxParticipants ?? '∞'}
                    </td>
                    <td class="text-center py-3 px-3">
                      {fillRate !== null ? (
                        <span
                          class={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            fillRate >= 90
                              ? 'bg-red-100 text-red-700'
                              : fillRate >= 70
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {fillRate}%
                        </span>
                      ) : (
                        <span class="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr class="border-t-2 border-[var(--color-anjou-beige)] font-semibold">
                <td class="py-3 px-3 text-[var(--color-anjou-brown)]">Total</td>
                {types.map((type) => {
                  const total = activitiesBreakdown.reduce(
                    (sum, a) => sum + (a.participantsByType[type] || 0),
                    0
                  );
                  return (
                    <td key={type} class="text-center py-3 px-3 text-[var(--color-anjou-brown)]">
                      {total}
                    </td>
                  );
                })}
                <td class="text-center py-3 px-3 text-[var(--color-anjou-brown)]">
                  {activitiesBreakdown.reduce((sum, a) => sum + a.totalParticipants, 0)}
                </td>
                <td class="text-center py-3 px-3 text-gray-500">
                  {activitiesBreakdown.reduce(
                    (sum, a) => sum + (a.maxParticipants ?? 0),
                    0
                  ) || '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

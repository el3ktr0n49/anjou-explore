import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';
import type { PaymentDistribution } from '../../types';

Chart.register(...registerables);

interface Props {
  paymentDistribution: PaymentDistribution;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Payé', color: '#10b981' },
  PENDING: { label: 'En attente', color: '#f59e0b' },
  FAILED: { label: 'Échoué', color: '#ef4444' },
  REFUNDED: { label: 'Remboursé', color: '#3b82f6' },
  CANCELLED: { label: 'Annulé', color: '#6b7280' },
};

export default function PaymentStatusChart({ paymentDistribution }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Filtrer les statuts qui ont au moins 1 réservation
    const entries = Object.entries(paymentDistribution).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      // Pas de données, pas de chart
      return;
    }

    const labels = entries.map(([status]) => STATUS_CONFIG[status]?.label || status);
    const data = entries.map(([, count]) => count);
    const colors = entries.map(([status]) => STATUS_CONFIG[status]?.color || '#6b7280');

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [paymentDistribution]);

  const total = Object.values(paymentDistribution).reduce((s, c) => s + c, 0);

  if (total === 0) {
    return (
      <div class="chart-card">
        <h3 class="chart-title">Répartition des paiements</h3>
        <div class="chart-empty">Aucune réservation</div>
      </div>
    );
  }

  return (
    <div class="chart-card">
      <h3 class="chart-title">Répartition des paiements</h3>
      <div style={{ position: 'relative', height: '280px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

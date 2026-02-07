import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';
import type { ActivityBreakdown } from '../../types';

Chart.register(...registerables);

interface Props {
  activitiesBreakdown: ActivityBreakdown[];
}

export default function RevenueChart({ activitiesBreakdown }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = activitiesBreakdown.map((a) => a.activityName);

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Payé',
            data: activitiesBreakdown.map((a) => a.revenuePaid),
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'En attente',
            data: activitiesBreakdown.map((a) => a.revenuePending),
            backgroundColor: 'rgba(245, 158, 11, 0.7)',
            borderColor: 'rgb(245, 158, 11)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${value.toFixed(2)} €`;
              },
            },
          },
        },
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value} €`,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [activitiesBreakdown]);

  return (
    <div class="chart-card">
      <h3 class="chart-title">Revenus par activité</h3>
      <div style={{ position: 'relative', height: '280px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';
import type { TimelineEntry } from '../../types';

Chart.register(...registerables);

interface Props {
  inscriptionsTimeline: TimelineEntry[];
}

export default function InscriptionsTimelineChart({ inscriptionsTimeline }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || inscriptionsTimeline.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = inscriptionsTimeline.map((e) => {
      const d = new Date(e.date);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Inscriptions cumulées',
            data: inscriptionsTimeline.map((e) => e.cumulativeCount),
            borderColor: 'rgb(196, 165, 113)',
            backgroundColor: 'rgba(196, 165, 113, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: 'rgb(196, 165, 113)',
          },
          {
            label: 'Inscriptions / jour',
            data: inscriptionsTimeline.map((e) => e.count),
            borderColor: 'rgb(107, 116, 86)',
            backgroundColor: 'rgba(107, 116, 86, 0.5)',
            type: 'bar' as const,
            borderRadius: 3,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx !== undefined && inscriptionsTimeline[idx]) {
                  const d = new Date(inscriptionsTimeline[idx].date);
                  return d.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                }
                return '';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [inscriptionsTimeline]);

  if (inscriptionsTimeline.length === 0) {
    return (
      <div class="chart-card chart-card-wide">
        <h3 class="chart-title">Évolution des inscriptions</h3>
        <div class="chart-empty">Aucune inscription</div>
      </div>
    );
  }

  return (
    <div class="chart-card chart-card-wide">
      <h3 class="chart-title">Évolution des inscriptions</h3>
      <div style={{ position: 'relative', height: '300px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

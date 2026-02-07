import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';
import type { ActivityBreakdown } from '../../types';

Chart.register(...registerables);

interface Props {
  activitiesBreakdown: ActivityBreakdown[];
}

export default function ParticipantsChart({ activitiesBreakdown }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = activitiesBreakdown.map((a) => a.activityName);
    const datasets: any[] = [
      {
        label: 'Participants inscrits',
        data: activitiesBreakdown.map((a) => a.totalParticipants),
        backgroundColor: 'rgba(196, 165, 113, 0.7)',
        borderColor: 'rgb(196, 165, 113)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ];

    // Ajouter les places max si au moins une activité en a
    if (activitiesBreakdown.some((a) => a.maxParticipants !== null)) {
      datasets.push({
        label: 'Places max',
        data: activitiesBreakdown.map((a) => a.maxParticipants),
        backgroundColor: 'rgba(107, 116, 86, 0.15)',
        borderColor: 'rgb(107, 116, 86)',
        borderWidth: 1,
        borderDash: [5, 5],
        borderRadius: 4,
      });
    }

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [activitiesBreakdown]);

  return (
    <div class="chart-card">
      <h3 class="chart-title">Participants par activité</h3>
      <div style={{ position: 'relative', height: '280px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

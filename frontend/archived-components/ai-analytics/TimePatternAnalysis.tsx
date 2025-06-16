"use client";

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Clock, AlertTriangle } from 'lucide-react';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface TimePatternAnalysisProps {
  playerName: string;
}

interface HourPerf {
  hour_of_day: number;
  hands_played: number;
  bb_per_100_hands: number;
  aggression_factor: number;
  tilt_events_count: number;
}

interface WeekdayPerf {
  day_of_week: number;
  day_name: string;
  hands_played: number;
  bb_per_100_hands: number;
  tilt_events_count: number;
  avg_session_length_minutes: number;
}

interface OptimalTimes {
  best_hour_of_day: number | null;
  best_day_of_week: number | null;
  best_time_category: string | null;
  optimal_bb_per_100: number;
  worst_hour_of_day: number | null;
  worst_day_of_week: number | null;
  worst_time_category: string | null;
  worst_bb_per_100: number;
  recommended_session_length_minutes: number;
  avoid_hours: number[];
  data_confidence: number;
}

export default function TimePatternAnalysis({ playerName }: TimePatternAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hourly, setHourly] = useState<HourPerf[]>([]);
  const [weekday, setWeekday] = useState<WeekdayPerf[]>([]);
  const [optimal, setOptimal] = useState<OptimalTimes | null>(null);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/time-patterns?player=${encodeURIComponent(playerName)}`);
        if (!res.ok) throw new Error('Kunde inte hämta tidsmönster');
        const data = await res.json();
        setHourly(data.hourly_performance || []);
        setWeekday(data.weekday_performance || []);
        setOptimal(data.optimal_times || null);
        setInsights(data.insights || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Okänt fel');
      } finally {
        setLoading(false);
      }
    };
    if (playerName) fetchData();
  }, [playerName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Clock className="w-12 h-12 text-cyan-500 animate-spin" />
        <p className="text-gray-400">Laddar tidsanalys...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const hourLabels = hourly.map(h => `${h.hour_of_day}:00`);
  const hourChartData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'BB/100',
        data: hourly.map(h => h.bb_per_100_hands),
        backgroundColor: 'rgba(99,102,241,0.6)',
      },
    ],
  };

  const weekdayLabels = weekday.map(w => w.day_name);
  const weekdayChartData = {
    labels: weekdayLabels,
    datasets: [
      {
        label: 'BB/100',
        data: weekday.map(w => w.bb_per_100_hands),
        backgroundColor: 'rgba(168,85,247,0.6)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' },
      },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.95)',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75,85,99,0.2)' },
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75,85,99,0.2)' },
      },
    },
  } as const;

  return (
    <div className="space-y-8">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700/50 p-6 rounded-2xl backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Tidsbaserade insikter
          </h3>
          <ul className="space-y-3 list-disc list-inside text-gray-300">
            {insights.map((ins, idx) => (
              <li key={idx}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hourly Performance */}
      {hourly.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700/50 p-6 rounded-2xl backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Prestanda per timme</h3>
          <div style={{ height: 300 }}>
            <Bar data={hourChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Weekday Performance */}
      {weekday.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700/50 p-6 rounded-2xl backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Prestanda per veckodag</h3>
          <div style={{ height: 300 }}>
            <Bar data={weekdayChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Optimal summary */}
      {optimal && (
        <div className="bg-gradient-to-r from-cyan-600/10 to-purple-600/10 border border-cyan-600/30 p-6 rounded-2xl backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Optimala speltider</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300 text-sm">
            {optimal.best_hour_of_day !== null && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-cyan-400">{optimal.best_hour_of_day}:00</span>
                <span>Bästa timme</span>
              </div>
            )}
            {optimal.worst_hour_of_day !== null && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-red-400">{optimal.worst_hour_of_day}:00</span>
                <span>Sämsta timme</span>
              </div>
            )}
            {optimal.best_day_of_week !== null && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-cyan-400">{['Mån','Tis','Ons','Tor','Fre','Lör','Sön'][optimal.best_day_of_week]}</span>
                <span>Bästa dag</span>
              </div>
            )}
            {optimal.worst_day_of_week !== null && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-red-400">{['Mån','Tis','Ons','Tor','Fre','Lör','Sön'][optimal.worst_day_of_week]}</span>
                <span>Sämsta dag</span>
              </div>
            )}
            {optimal.recommended_session_length_minutes > 0 && (
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <span className="text-2xl font-bold text-cyan-400">
                  {Math.floor(optimal.recommended_session_length_minutes/60)}h {optimal.recommended_session_length_minutes%60}m
                </span>
                <span>Rekommenderad sessionslängd</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
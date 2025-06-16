"use client";

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FaChartLine, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendData {
  date: string;
  vpip: number;
  pfr: number;
  winRate: number;
  netWinBB: number;
  handsPlayed: number;
}

interface PlayerTrendsChartProps {
  playerName: string;
}

const PlayerTrendsChart: React.FC<PlayerTrendsChartProps> = ({ playerName }) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/players/${encodeURIComponent(playerName)}/trends`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch trend data');
        }

        const data = await response.json();
        setTrendData(data.trendData);
        setCurrentStats(data.currentStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (playerName) {
      fetchTrends();
    }
  }, [playerName]);

  const getTrendDirection = (data: number[]) => {
    if (data.length < 2) return 'stable';
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <FaArrowUp className="text-green-400" />;
      case 'down': return <FaArrowDown className="text-red-400" />;
      default: return <FaMinus className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-center h-64">
          <div className="spinner mb-4"></div>
          <span className="text-gray-400 ml-4">Loading trend analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="text-center text-red-400">
          <FaChartLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load trend data</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const dates = trendData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const vpipData = trendData.map(d => d.vpip);
  const pfrData = trendData.map(d => d.pfr);
  const winRateData = trendData.map(d => d.winRate);
  const netWinData = trendData.map(d => d.netWinBB);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      }
    }
  };

  const vpipPfrChart = {
    labels: dates,
    datasets: [
      {
        label: 'VPIP %',
        data: vpipData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: false,
        tension: 0.3,
      },
      {
        label: 'PFR %',
        data: pfrData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: false,
        tension: 0.3,
      }
    ]
  };

  const winRateChart = {
    labels: dates,
    datasets: [
      {
        label: 'Win Rate %',
        data: winRateData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      }
    ]
  };

  const netWinChart = {
    labels: dates,
    datasets: [
      {
        label: 'Net Win (BB)',
        data: netWinData,
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fill: true,
        tension: 0.3,
      }
    ]
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
          <FaChartLine className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Performance Trends</h3>
          <p className="text-gray-400 text-sm">30-day analysis for {playerName}</p>
        </div>
      </div>

      {/* Trend Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">VPIP Trend</p>
              <p className="text-lg font-bold text-white">{currentStats?.vpip?.toFixed(1)}%</p>
            </div>
            {getTrendIcon(getTrendDirection(vpipData))}
          </div>
        </div>
        
        <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">PFR Trend</p>
              <p className="text-lg font-bold text-white">{currentStats?.pfr?.toFixed(1)}%</p>
            </div>
            {getTrendIcon(getTrendDirection(pfrData))}
          </div>
        </div>
        
        <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Win Rate</p>
              <p className="text-lg font-bold text-white">{currentStats?.winRate?.toFixed(1)}%</p>
            </div>
            {getTrendIcon(getTrendDirection(winRateData))}
          </div>
        </div>
        
        <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Net Win</p>
              <p className="text-lg font-bold text-white">{currentStats?.netWinBB?.toFixed(0)} BB</p>
            </div>
            {getTrendIcon(getTrendDirection(netWinData))}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-600/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Playing Style (VPIP/PFR)</h4>
          <div className="h-64">
            <Line data={vpipPfrChart} options={chartOptions} />
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-600/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Win Rate Progression</h4>
          <div className="h-64">
            <Line data={winRateChart} options={chartOptions} />
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-600/30 lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Net Win Development (BB)</h4>
          <div className="h-64">
            <Line data={netWinChart} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerTrendsChart; 
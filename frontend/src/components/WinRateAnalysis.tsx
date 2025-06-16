'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Award, AlertTriangle, Sparkles } from 'lucide-react';

interface WinRateData {
  category: string;
  count: number;
  avg_winrate: number;
  percentage: number;
}

const COLORS = ['#dc2626', '#ef4444', '#f59e0b', '#10b981', '#059669', '#047857'];

const getCategoryColor = (category: string) => {
  if (category.includes('Heavy Loser')) return '#dc2626';
  if (category.includes('Loser') && !category.includes('Heavy')) return '#ef4444';
  if (category.includes('Slight Loser')) return '#f97316';
  if (category.includes('Break Even')) return '#f59e0b';
  if (category.includes('Small Winner')) return '#84cc16';
  if (category.includes('Winner') && !category.includes('Small') && !category.includes('Big')) return '#10b981';
  if (category.includes('Big Winner')) return '#047857';
  return '#6b7280';
};

const getCategoryIcon = (category: string) => {
  if (category.includes('Heavy Losers')) return <TrendingDown className="h-5 w-5 text-red-500" />;
  if (category.includes('Losers')) return <TrendingDown className="h-5 w-5 text-red-400" />;
  if (category.includes('Break Even')) return <Target className="h-5 w-5 text-yellow-500" />;
  if (category.includes('Small Winners')) return <TrendingUp className="h-5 w-5 text-green-500" />;
  if (category.includes('Good Winners')) return <Award className="h-5 w-5 text-green-600" />;
  if (category.includes('Crushers')) return <Sparkles className="h-5 w-5 text-green-700" />;
  return <Users className="h-5 w-5 text-gray-500" />;
};

// Add shimmer animation
const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;

export default function WinRateAnalysis() {
  const [data, setData] = useState<WinRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/winrate-distribution');
        if (!response.ok) throw new Error('Failed to fetch win rate data');
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-400">Loading win rate analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-gradient-to-br from-red-900/20 to-red-800/20 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>Error loading win rate data: {error}</span>
        </div>
      </div>
    );
  }

  // Ensure data is an array before using array methods
  const safeData = Array.isArray(data) ? data : [];
  
  const totalPlayers = safeData.reduce((sum, item) => sum + item.count, 0);
  const winningPlayers = safeData.filter(item => item.avg_winrate > 0).reduce((sum, item) => sum + item.count, 0);
  const losingPlayers = safeData.filter(item => item.avg_winrate < 0).reduce((sum, item) => sum + item.count, 0);
  const breakEvenPlayers = safeData.filter(item => item.avg_winrate === 0 || item.category.includes('No Win Rate Data')).reduce((sum, item) => sum + item.count, 0);
  
  // Check if we have actual win rate data
  const hasWinRateData = !safeData.some(item => item.category.includes('No Win Rate Data'));

  return (
    <>
      <style jsx>{shimmerStyle}</style>
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm group hover:border-indigo-500/30 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative">
        {/* Stats only */}
        <div className="flex items-center justify-end mb-6">
          <div className="text-right">
            <p className="text-sm text-gray-400">Active Players</p>
            <p className="text-2xl font-bold text-white">{totalPlayers.toLocaleString('en-US')}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 p-4 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-green-400">Winning Players</p>
                <p className="text-xl font-bold text-white">{winningPlayers.toLocaleString('en-US')}</p>
                <p className="text-xs text-green-300">{((winningPlayers / totalPlayers) * 100).toFixed(1)}% of total</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 p-4 rounded-xl border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-yellow-400">Break Even</p>
                <p className="text-xl font-bold text-white">{breakEvenPlayers.toLocaleString('en-US')}</p>
                <p className="text-xs text-yellow-300">{((breakEvenPlayers / totalPlayers) * 100).toFixed(1)}% of total</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 p-4 rounded-xl border border-red-500/20">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-red-400">Losing Players</p>
                <p className="text-xl font-bold text-white">{losingPlayers.toLocaleString('en-US')}</p>
                <p className="text-xs text-red-300">{((losingPlayers / totalPlayers) * 100).toFixed(1)}% of total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Bar Chart - Custom Implementation */}
          <div className="xl:pr-4">
            <h4 className="text-lg font-semibold text-white mb-4">Player Count by Category</h4>
            <div className="space-y-4">
              {safeData.map((item, index) => {
                const maxCount = Math.max(...safeData.map(d => d.count));
                const percentage = (item.count / maxCount) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-300 font-medium truncate max-w-[200px]" title={item.category}>
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{item.count}</span>
                        <span className="text-gray-400">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-800/50 rounded-lg overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${getCategoryColor(item.category)} 0%, ${getCategoryColor(item.category)}dd 100%)`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      </div>
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs text-white/80 font-medium">
                          Avg: {item.avg_winrate} BB/100
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie Chart */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Distribution Overview</h4>
            <div className="relative">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={safeData}
                    cx="50%"
                    cy="50%"
                    labelLine={{
                      stroke: '#6b7280',
                      strokeWidth: 1,
                      strokeDasharray: '3 3'
                    }}
                    label={({ category, percentage, cx, cy, midAngle, innerRadius, outerRadius, index }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 30;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#e5e7eb" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-sm font-medium"
                        >
                          {`${percentage}%`}
                        </text>
                      );
                    }}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="count"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {safeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getCategoryColor(entry.category)}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                      border: '1px solid rgba(55, 65, 81, 0.5)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value: any, name: any, props: any) => [
                      <div key="content" className="space-y-1">
                        <div className="text-white">{value} players ({props.payload.percentage}%)</div>
                        <div className="text-gray-400 text-sm">Avg: {props.payload.avg_winrate} BB/100</div>
                      </div>,
                      ''
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{totalPlayers}</p>
                  <p className="text-sm text-gray-400">Players</p>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {safeData.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-800/30 transition-colors cursor-pointer group"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-transparent group-hover:ring-white/20 transition-all" 
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                  />
                  <span className="text-gray-300 truncate group-hover:text-white transition-colors">
                    {item.category}
                  </span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h4>
          <div className="space-y-3">
            {safeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(item.category)}
                  <div>
                    <p className="font-medium text-white">{item.category}</p>
                    <p className="text-sm text-gray-400">Average: {item.avg_winrate} BB/100</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{item.count.toLocaleString('en-US')}</p>
                  <p className="text-sm text-gray-400">{item.percentage}% of players</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 
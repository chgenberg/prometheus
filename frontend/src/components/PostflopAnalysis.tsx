'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Activity, Target, TrendingUp, Users, Zap, Brain, AlertTriangle, Award, Layers } from 'lucide-react';

interface PostflopData {
  players_with_data: number;
  avg_postflop_score: number;
  avg_flop_score: number;
  avg_turn_score: number;
  avg_river_score: number;
  avg_difficulty: number;
  street_comparison: Array<{
    street: string;
    avg_score: number;
    difficulty: number;
    decisions: number;
  }>;
  top_performers: Array<{
    player: string;
    overall_score: number;
    flop_score: number;
    turn_score: number;
    river_score: number;
    total_decisions: number;
    difficulty: number;
  }>;
}

export default function PostflopAnalysis() {
  const [data, setData] = useState<PostflopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/postflop-analysis');
        if (!response.ok) throw new Error('Failed to fetch postflop data');
        
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading postflop analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-gradient-to-br from-red-900/20 to-red-800/20 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>Error loading postflop data: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Safe access to data properties with fallbacks
  const avgDifficulty = data.avg_difficulty ?? 0;
  const avgFlopScore = data.avg_flop_score ?? 0;
  const avgTurnScore = data.avg_turn_score ?? 0;
  const avgRiverScore = data.avg_river_score ?? 0;
  const avgPostflopScore = data.avg_postflop_score ?? 0;
  const streetComparison = data.street_comparison ?? [];
  const topPerformers = data.top_performers ?? [];

  const radarData = [
    { subject: 'Flop Play', score: avgFlopScore, fullMark: 100 },
    { subject: 'Turn Play', score: avgTurnScore, fullMark: 100 },
    { subject: 'River Play', score: avgRiverScore, fullMark: 100 },
    { subject: 'Overall', score: avgPostflopScore, fullMark: 100 },
    { subject: 'Difficulty', score: avgDifficulty * 20, fullMark: 100 }, // Scale difficulty to 0-100
  ];

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm group hover:border-purple-500/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative">
        {/* Stats only */}
        <div className="flex items-center justify-end mb-6">
          <div className="text-right">
            <p className="text-sm text-gray-400">Players Analyzed</p>
            <p className="text-2xl font-bold text-white">{data.players_with_data}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 p-4 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-blue-400">Flop Score</p>
                <p className="text-xl font-bold text-white">{avgFlopScore.toFixed(1)}</p>
                <p className="text-xs text-blue-300">Average quality</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 p-4 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-green-400">Turn Score</p>
                <p className="text-xl font-bold text-white">{avgTurnScore.toFixed(1)}</p>
                <p className="text-xs text-green-300">Average quality</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 p-4 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-purple-400">River Score</p>
                <p className="text-xl font-bold text-white">{avgRiverScore.toFixed(1)}</p>
                <p className="text-xs text-purple-300">Average quality</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 p-4 rounded-xl border border-orange-500/20">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-orange-400">Difficulty</p>
                <p className="text-xl font-bold text-white">{avgDifficulty.toFixed(2)}</p>
                <p className="text-xs text-orange-300">Decision complexity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Street Comparison - Custom Implementation */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Street Performance Comparison</h4>
            <div className="space-y-6">
              {streetComparison.map((street, index) => {
                const maxScore = 100;
                const percentage = (street.avg_score / maxScore) * 100;
                const streetColors = {
                  'Flop': '#3B82F6',
                  'Turn': '#10B981',
                  'River': '#8B5CF6'
                };
                const color = streetColors[street.street as keyof typeof streetColors] || '#6B7280';
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white"
                          style={{ backgroundColor: `${color}33` }}
                        >
                          <span style={{ color }}>{street.street[0]}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{street.street}</p>
                          <p className="text-xs text-gray-400">
                            {street.decisions} decisions • Difficulty: {street.difficulty.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{street.avg_score.toFixed(1)}</p>
                        <p className="text-xs text-gray-400">Average Score</p>
                      </div>
                    </div>
                    <div className="relative h-10 bg-gray-800/50 rounded-lg overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out flex items-center"
                        style={{ 
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar Chart */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Overall Performance Profile</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                />
                <Radar
                  name="Performance"
                  dataKey="score"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Top Postflop Performers</h4>
          <div className="space-y-3">
            {topPerformers.slice(0, 5).map((player, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full border border-purple-500/30">
                    <span className="text-sm font-bold text-purple-400">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{player.player}</p>
                    <p className="text-sm text-gray-400">{player.total_decisions} decisions analyzed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{player.overall_score.toFixed(1)}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-blue-400">F: {player.flop_score.toFixed(0)}</span>
                    <span className="text-green-400">T: {player.turn_score.toFixed(0)}</span>
                    <span className="text-purple-400">R: {player.river_score.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-gradient-to-br from-indigo-900/20 to-indigo-800/20 rounded-xl border border-indigo-500/20">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="h-5 w-5 text-indigo-500" />
            <h4 className="text-lg font-semibold text-white">Key Insights</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-indigo-400 font-medium">Street Performance:</p>
              <p className="text-gray-300">
                {avgFlopScore > avgTurnScore && avgFlopScore > avgRiverScore 
                  ? "Players perform best on the flop, suggesting strong preflop hand selection."
                  : avgRiverScore > avgFlopScore 
                  ? "River play is strongest, indicating good value betting and bluff catching."
                  : "Turn play shows the highest quality, suggesting good barrel decisions."}
              </p>
            </div>
            <div>
              <p className="text-indigo-400 font-medium">Decision Complexity:</p>
              <p className="text-gray-300">
                Average decision difficulty of {avgDifficulty.toFixed(2)} indicates 
                {avgDifficulty > 2 ? " highly complex spots being analyzed." : " moderate complexity decisions."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
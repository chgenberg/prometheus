'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Target, TrendingUp, Award, Users, BarChart3, Sparkles, Zap, Activity, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AIPlayer {
  player_name: string;
  hands_played: number;
  avg_preflop_score: number;
  avg_postflop_score: number;
  preflop_hands?: number;
  vpip_hands?: number;
  preflop_vpip: number;
  preflop_pfr: number;
}

interface AIMetrics {
  totalPlayers: number;
  avgPreflopScore: number;
  avgPostflopScore: number;
  playersWithPreflopData: number;
  playersWithPostflopData: number;
}

export default function AIPerformanceAnalytics() {
  const [players, setPlayers] = useState<AIPlayer[]>([]);
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'preflop' | 'postflop'>('preflop');
  const router = useRouter();

  const handlePlayerClick = (playerName: string) => {
    router.push(`/?player=${encodeURIComponent(playerName)}`);
  };

  useEffect(() => {
    fetchAIData();
  }, []);

  const fetchAIData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/players?limit=500&sortBy=avg_preflop_score&sortOrder=desc');
      const data = await response.json();
      
      if (data.players) {
        setPlayers(data.players);
        
        // Calculate AI metrics
        const totalPlayers = data.players.length;
        const playersWithPreflopData = data.players.filter((p: AIPlayer) => p.avg_preflop_score > 0).length;
        const playersWithPostflopData = data.players.filter((p: AIPlayer) => p.avg_postflop_score > 0).length;
        
        // Only calculate averages for players with actual data (score > 0)
        const avgPreflopScore = playersWithPreflopData > 0 
          ? data.players
              .filter((p: AIPlayer) => p.avg_preflop_score > 0)
              .reduce((sum: number, p: AIPlayer) => sum + p.avg_preflop_score, 0) / playersWithPreflopData
          : 0;
          
        const avgPostflopScore = playersWithPostflopData > 0
          ? data.players
              .filter((p: AIPlayer) => p.avg_postflop_score > 0)
              .reduce((sum: number, p: AIPlayer) => sum + p.avg_postflop_score, 0) / playersWithPostflopData
          : 0;
        
        setMetrics({
          totalPlayers,
          avgPreflopScore,
          avgPostflopScore,
          playersWithPreflopData,
          playersWithPostflopData
        });
      }
    } catch (error) {
      console.error('Failed to fetch AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceLevel = (score: number, type: 'preflop' | 'postflop') => {
    if (type === 'preflop') {
      // Updated to handle 0-100 scale instead of 0-1
      if (score >= 80) return { level: 'Expert', color: 'text-green-500 bg-green-500/20' };
      if (score >= 70) return { level: 'Advanced', color: 'text-blue-500 bg-blue-500/20' };
      if (score >= 60) return { level: 'Intermediate', color: 'text-yellow-500 bg-yellow-500/20' };
      if (score >= 40) return { level: 'Beginner', color: 'text-orange-500 bg-orange-500/20' };
      return { level: 'Learning', color: 'text-red-500 bg-red-500/20' };
    } else {
      // Postflop scores are typically 0 in this dataset, so we'll use a different scale
      if (score >= 50) return { level: 'Expert', color: 'text-green-500 bg-green-500/20' };
      if (score >= 30) return { level: 'Advanced', color: 'text-blue-500 bg-blue-500/20' };
      if (score >= 20) return { level: 'Intermediate', color: 'text-yellow-500 bg-yellow-500/20' };
      if (score >= 10) return { level: 'Beginner', color: 'text-orange-500 bg-orange-500/20' };
      return { level: 'No Data', color: 'text-gray-500 bg-gray-500/20' };
    }
  };

  const getScoreDistribution = (type: 'preflop' | 'postflop') => {
    const scores = players.map(p => type === 'preflop' ? p.avg_preflop_score : p.avg_postflop_score);
    
    if (type === 'preflop') {
      // Updated to handle 0-100 scale
      return [
        { range: '80-100', count: scores.filter(s => s >= 80).length, color: '#10b981' },
        { range: '70-80', count: scores.filter(s => s >= 70 && s < 80).length, color: '#3b82f6' },
        { range: '60-70', count: scores.filter(s => s >= 60 && s < 70).length, color: '#f59e0b' },
        { range: '40-60', count: scores.filter(s => s >= 40 && s < 60).length, color: '#ef4444' },
        { range: '0-40', count: scores.filter(s => s < 40).length, color: '#6b7280' }
      ];
    } else {
      return [
        { range: '50+', count: scores.filter(s => s >= 50).length, color: '#10b981' },
        { range: '30-50', count: scores.filter(s => s >= 30 && s < 50).length, color: '#3b82f6' },
        { range: '20-30', count: scores.filter(s => s >= 20 && s < 30).length, color: '#f59e0b' },
        { range: '10-20', count: scores.filter(s => s >= 10 && s < 20).length, color: '#ef4444' },
        { range: '0-10', count: scores.filter(s => s < 10).length, color: '#6b7280' }
      ];
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-3xl blur-3xl animate-pulse" />
        <div className="relative bg-gray-900/40 backdrop-blur-xl p-8 rounded-3xl border border-gray-800/50 shadow-2xl">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-700/50 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-700/50 rounded w-48"></div>
                <div className="h-4 bg-gray-700/50 rounded w-64"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700/50 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreDistribution = getScoreDistribution(selectedMetric);
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = selectedMetric === 'preflop' ? a.avg_preflop_score : a.avg_postflop_score;
    const scoreB = selectedMetric === 'preflop' ? b.avg_preflop_score : b.avg_postflop_score;
    return scoreB - scoreA;
  });

  return (
    <div className="relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-indigo-500/5 rounded-3xl blur-3xl animate-pulse" />
      
      <div className="relative space-y-6">


        {/* AI Metrics Cards with enhanced design */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <Zap className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Players Analyzed</p>
                <p className="text-3xl font-bold text-white mt-1">{metrics.totalPlayers}</p>
                <div className="mt-2 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 rounded-2xl border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Avg Preflop Score</p>
                <p className="text-3xl font-bold text-white mt-1">{metrics.avgPreflopScore.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.playersWithPreflopData} players with data</p>
                <div className="mt-2 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full animate-pulse" style={{ width: `${Math.min(metrics.avgPreflopScore, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <Activity className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Avg Postflop Score</p>
                <p className="text-3xl font-bold text-white mt-1">{metrics.avgPostflopScore.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.playersWithPostflopData} players with data</p>
                <div className="mt-2 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: `${Math.min((metrics.avgPostflopScore / 100) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 p-6 rounded-2xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <Sparkles className="h-4 w-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">Expert Players</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {players.filter(p => p.avg_preflop_score >= 80).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Preflop score ≥ 80</p>
                <div className="mt-2 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full" style={{ width: `${(players.filter(p => p.avg_preflop_score >= 80).length / players.length) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Metric Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Analysis type:</span>
        <button
          onClick={() => setSelectedMetric('preflop')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedMetric === 'preflop'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
          }`}
        >
          Preflop Analysis
        </button>
        <button
          onClick={() => setSelectedMetric('postflop')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedMetric === 'postflop'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
          }`}
        >
          Postflop Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {selectedMetric === 'preflop' ? 'Preflop' : 'Postflop'} Score Distribution
          </h3>
          
          <div className="space-y-3">
            {scoreDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-16 text-sm text-gray-400">{item.range}</div>
                <div className="flex-1 relative">
                  <div className="h-6 bg-gray-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ 
                        width: `${(item.count / players.length) * 100}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {item.count} players
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-400 text-right">
                  {((item.count / players.length) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top {selectedMetric === 'preflop' ? 'Preflop' : 'Postflop'} Performers
          </h3>
          
          <div className="space-y-3">
            {sortedPlayers.slice(0, 8).map((player, index) => {
              const score = selectedMetric === 'preflop' ? player.avg_preflop_score : player.avg_postflop_score;
              const performance = getPerformanceLevel(score, selectedMetric);
              
              return (
                <div key={player.player_name} className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full text-yellow-500 text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => handlePlayerClick(player.player_name)}
                      className="text-white font-medium hover:text-indigo-300 transition-colors cursor-pointer text-left"
                    >
                      {player.player_name}
                    </button>
                    <div className="text-xs text-gray-400">
                      {player.hands_played} hands • VPIP: {player.preflop_vpip.toFixed(1)}% • PFR: {player.preflop_pfr.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {score.toFixed(1)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${performance.color}`}>
                      {performance.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
} 
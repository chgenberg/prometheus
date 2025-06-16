'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Users, Target, Brain, Eye, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SecurityPlayer {
  player_name: string;
  hands_played: number;
  intention_score: number;
  collusion_score: number;
  bad_actor_score: number;
  bot_score: number;
  preflop_vpip: number;
  preflop_pfr: number;
  last_updated: string;
}

interface SecurityMetrics {
  totalPlayers: number;
  flaggedPlayers: number;
  avgIntentionScore: number;
  avgCollusionScore: number;
  avgBadActorScore: number;
  highRiskPlayers: number;
}

export default function AdvancedSecurityDashboard() {
  const [players, setPlayers] = useState<SecurityPlayer[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [highRiskPlayers, setHighRiskPlayers] = useState<SecurityPlayer[]>([]);
  const [highRiskPage, setHighRiskPage] = useState(0);
  const [loadingHighRisk, setLoadingHighRisk] = useState(true);
  const [hasMoreHighRisk, setHasMoreHighRisk] = useState(true);
  const router = useRouter();

  const handlePlayerClick = (playerName: string) => {
    router.push(`/?player=${encodeURIComponent(playerName)}`);
  };

  const fetchHighRiskPlayers = useCallback(async (page: number) => {
    setLoadingHighRisk(true);
    try {
      const response = await fetch(`/api/players?limit=10&page=${page}&sortBy=bot_score&sortOrder=desc`);
      const data = await response.json();
      if (data.players) {
        setHighRiskPlayers(data.players);
        setHasMoreHighRisk(data.hasNextPage);
      }
    } catch (error) {
      console.error('Failed to fetch high risk players:', error);
    } finally {
      setLoadingHighRisk(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityData();
    fetchHighRiskPlayers(highRiskPage);
  }, [fetchHighRiskPlayers, highRiskPage]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch players with security scores
      const playersResponse = await fetch('/api/players?limit=100&sortBy=bad_actor_score&sortOrder=desc');
      const playersData = await playersResponse.json();
      
      if (playersData.players) {
        const validPlayers = playersData.players.filter((p: SecurityPlayer | null) => p);
        setPlayers(validPlayers as SecurityPlayer[]);
        
        // Calculate metrics
        const totalPlayers = validPlayers.length;
        const flaggedPlayers = validPlayers.filter((p: SecurityPlayer) => 
          (p.bad_actor_score || 0) > 50 || (p.intention_score || 0) > 50 || (p.collusion_score || 0) > 50
        ).length;
        
        const intentionScores = validPlayers.map((p: SecurityPlayer) => p.intention_score).filter((s: number | null | undefined): s is number => typeof s === 'number');
        const collusionScores = validPlayers.map((p: SecurityPlayer) => p.collusion_score).filter((s: number | null | undefined): s is number => typeof s === 'number');
        const badActorScores = validPlayers.map((p: SecurityPlayer) => p.bad_actor_score).filter((s: number | null | undefined): s is number => typeof s === 'number');

        const avgIntentionScore = intentionScores.length > 0 ? intentionScores.reduce((sum: number, s: number) => sum + s, 0) / intentionScores.length : 0;
        const avgCollusionScore = collusionScores.length > 0 ? collusionScores.reduce((sum: number, s: number) => sum + s, 0) / collusionScores.length : 0;
        const avgBadActorScore = badActorScores.length > 0 ? badActorScores.reduce((sum: number, s: number) => sum + s, 0) / badActorScores.length : 0;
        
        const highRiskPlayers = validPlayers.filter((p: SecurityPlayer) => 
          (p.bad_actor_score || 0) > 75 || (p.intention_score || 0) > 75 || (p.collusion_score || 0) > 75
        ).length;
        
        setMetrics({
          totalPlayers,
          flaggedPlayers,
          avgIntentionScore,
          avgCollusionScore,
          avgBadActorScore,
          highRiskPlayers
        });
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (player: SecurityPlayer) => {
    const maxScore = Math.max(player.bad_actor_score || 0, player.intention_score || 0, player.collusion_score || 0);
    if (maxScore >= 80) return 'critical';
    if (maxScore >= 60) return 'high';
    if (maxScore >= 40) return 'medium';
    if (maxScore >= 20) return 'low';
    return 'minimal';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
      default: return 'text-green-500 bg-green-500/20 border-green-500/30';
    }
  };

  const filteredPlayers = selectedRiskLevel === 'all' 
    ? players 
    : players.filter(player => getRiskLevel(player) === selectedRiskLevel);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Security Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-400">Total Players</p>
                <p className="text-xl font-bold text-white">{metrics.totalPlayers}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-400">Flagged Players</p>
                <p className="text-xl font-bold text-white">{metrics.flaggedPlayers}</p>
                <p className="text-xs text-gray-500">
                  {((metrics.flaggedPlayers / metrics.totalPlayers) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Avg Intention Score</p>
                <p className="text-xl font-bold text-white">{metrics.avgIntentionScore?.toFixed(1) ?? 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-400">High Risk Players</p>
                <p className="text-xl font-bold text-white">{metrics.highRiskPlayers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High Risk Players List */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 overflow-hidden">
        <div className="p-4 border-b border-gray-700/30 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-500" />
            Top 10 High Risk Players (by Bot Score)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHighRiskPage(p => Math.max(0, p - 1))}
              disabled={highRiskPage === 0 || loadingHighRisk}
              className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">Page {highRiskPage + 1}</span>
            <button
              onClick={() => setHighRiskPage(p => p + 1)}
              disabled={!hasMoreHighRisk || loadingHighRisk}
              className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {loadingHighRisk ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-6 bg-gray-700/50 rounded"></div>)}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-700/30">
            {highRiskPlayers.map(player => (
              <li key={player.player_name} className="p-4 flex justify-between items-center hover:bg-gray-700/20">
                <button
                  onClick={() => handlePlayerClick(player.player_name)}
                  className="text-white font-medium hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {player.player_name}
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Bot Score:</span>
                  <span className="text-lg font-bold text-red-400">
                    {(player.bot_score || 0).toFixed(1)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Risk Level Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-400">Filter by risk level:</span>
        {['all', 'critical', 'high', 'medium', 'low', 'minimal'].map(level => (
          <button
            key={level}
            onClick={() => setSelectedRiskLevel(level)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedRiskLevel === level
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
            {level !== 'all' && (
              <span className="ml-1 text-xs opacity-75">
                ({players.filter(p => getRiskLevel(p) === level).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Players Table */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/30 overflow-hidden">
        <div className="p-4 border-b border-gray-700/30">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Security Analysis ({filteredPlayers.length} players)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Intention Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Collusion Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Bad Actor Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hands Played
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  VPIP/PFR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filteredPlayers.slice(0, 20).map((player, index) => {
                const riskLevel = getRiskLevel(player);
                const riskColor = getRiskColor(riskLevel);
                
                return (
                  <tr key={player.player_name} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayerClick(player.player_name)}
                          className="text-white font-medium hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          {player.player_name}
                        </button>
                        {index < 3 && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${riskColor}`}>
                        {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white">
                      {player.intention_score?.toFixed(1) ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white">
                      {player.collusion_score?.toFixed(1) ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white">
                      {player.bad_actor_score?.toFixed(1) ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-300">
                      {player.hands_played}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-300">
                      {player.preflop_vpip?.toFixed(1) ?? 'N/A'}% / {player.preflop_pfr?.toFixed(1) ?? 'N/A'}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
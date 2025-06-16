'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Eye, TrendingUp, TrendingDown, Users, Activity, Shield, Brain, Target, Star, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface PlayerStats {
  player_name: string;
  hands_played: number;
  net_win_chips: number;
  net_win_bb: number;
  win_rate_percent: number;
  preflop_vpip: number;
  preflop_pfr: number;
  postflop_aggression: number;
  showdown_win_percent: number;
  avg_preflop_score?: number;
  avg_postflop_score?: number;
  flop_score?: number;
  turn_score?: number;
  river_score?: number;
  intention_score?: number;
  collusion_score?: number;
  bad_actor_score?: number;
  bot_score?: number;
  num_players?: number;
  game_type?: string;
  last_updated?: string;
}

interface PlayerStatsTableProps {
  stats: PlayerStats[];
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onPlayerNameFilter?: (playerName: string) => void;
  currentSort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  playerNameFilter?: string;
}

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const formatPercentage = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return `${num.toFixed(1)}%`;
};

const getRiskColor = (score: number | undefined | null): string => {
  if (score === undefined || score === null || isNaN(score)) return 'text-gray-500';
  if (score >= 70) return 'text-red-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-green-400';
};

const getPerformanceColor = (bb: number | undefined | null): string => {
  if (bb === undefined || bb === null || isNaN(bb)) return 'text-gray-500';
  if (bb > 0) return 'text-green-400';
  if (bb < 0) return 'text-red-400';
  return 'text-gray-400';
};

export default function PlayerStatsTable({ 
  stats, 
  onSort, 
  onPlayerNameFilter, 
  currentSort,
  playerNameFilter = ''
}: PlayerStatsTableProps) {
  const [searchTerm, setSearchTerm] = useState(playerNameFilter);

  const handleSort = (column: string) => {
    if (!onSort || !currentSort) return;
    
    const newOrder = currentSort.sortBy === column && currentSort.sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(column, newOrder);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onPlayerNameFilter) {
      onPlayerNameFilter(searchTerm);
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (!currentSort || currentSort.sortBy !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-500 opacity-50" />;
    }
    return currentSort.sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-indigo-400" /> : 
      <ChevronDown className="w-4 h-4 text-indigo-400" />;
  };

  const SortableHeader = ({ column, children, className = "" }: { 
    column: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <th 
      className={`px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 transition-colors ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-700/30">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for a player..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700/30">
          <thead className="bg-gray-800/50">
            <tr>
              {/* Player Name - Always visible */}
              <SortableHeader column="player_name" className="sticky left-0 bg-gray-800/50 z-10 min-w-[200px]">
                <Users className="w-4 h-4 inline mr-1" />
                Player
              </SortableHeader>
              
              {/* Core Stats - Visible on mobile */}
              <SortableHeader column="hands_played" className="text-center">
                <Activity className="w-4 h-4 inline mr-1" />
                Hands
              </SortableHeader>
              <SortableHeader column="net_win_bb" className="text-center">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                BB Won
              </SortableHeader>
              
              {/* Extended Stats - Hidden on small screens */}
              <SortableHeader column="win_rate_percent" className="hidden sm:table-cell text-center">
                <Target className="w-4 h-4 inline mr-1" />
                Win Rate
              </SortableHeader>
              <SortableHeader column="preflop_vpip" className="hidden lg:table-cell text-center">
                VPIP
              </SortableHeader>
              <SortableHeader column="preflop_pfr" className="hidden lg:table-cell text-center">
                PFR
              </SortableHeader>
              <SortableHeader column="postflop_aggression" className="hidden lg:table-cell text-center">
                <Activity className="w-4 h-4 inline mr-1" />
                Aggression
              </SortableHeader>
              
              {/* AI Scores - Hidden on medium screens */}
              <SortableHeader column="avg_preflop_score" className="hidden xl:table-cell text-center">
                <Brain className="w-4 h-4 inline mr-1" />
                Preflop AI
              </SortableHeader>
              <SortableHeader column="avg_postflop_score" className="hidden xl:table-cell text-center">
                <Brain className="w-4 h-4 inline mr-1" />
                Postflop AI
              </SortableHeader>
              
              {/* Risk Analysis - Hidden on smaller screens */}
              <SortableHeader column="bad_actor_score" className="hidden 2xl:table-cell text-center">
                <Shield className="w-4 h-4 inline mr-1" />
                Risk Score
              </SortableHeader>
              <SortableHeader column="intention_score" className="hidden 2xl:table-cell text-center">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Intention
              </SortableHeader>
              
              {/* Actions */}
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-gray-900/20 divide-y divide-gray-700/20">
            {stats.map((player, index) => (
              <tr 
                key={player.player_name} 
                className={`hover:bg-gray-800/30 transition-colors ${index % 2 === 0 ? 'bg-gray-900/10' : ''}`}
              >
                {/* Player Name */}
                <td className="sticky left-0 bg-gray-900/80 backdrop-blur-sm px-2 sm:px-4 py-3 z-10">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {player.player_name.charAt(player.player_name.indexOf('/') + 1) || player.player_name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {player.player_name.replace('coinpoker/', '')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {player.game_type || 'Cash Game'}
                      </p>
                    </div>
                  </div>
                </td>
                
                {/* Core Stats */}
                <td className="px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-white font-medium">
                    {formatNumber(player.hands_played)}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center">
                  <span className={`text-sm font-medium ${getPerformanceColor(player.net_win_bb)}`}>
                    {player.net_win_bb > 0 ? '+' : ''}{formatNumber(player.net_win_bb)}
                  </span>
                </td>
                
                {/* Extended Stats */}
                <td className="hidden sm:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className={`text-sm ${getPerformanceColor(player.win_rate_percent)}`}>
                    {formatPercentage(player.win_rate_percent)}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-gray-300">
                    {formatPercentage(player.preflop_vpip)}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-gray-300">
                    {formatPercentage(player.preflop_pfr)}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-gray-300">
                    {formatNumber(player.postflop_aggression)}
                  </span>
                </td>
                
                {/* AI Scores */}
                <td className="hidden xl:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-blue-400">
                    {formatNumber(player.avg_preflop_score)}
                  </span>
                </td>
                <td className="hidden xl:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className="text-sm text-purple-400">
                    {formatNumber(player.avg_postflop_score)}
                  </span>
                </td>
                
                {/* Risk Analysis */}
                <td className="hidden 2xl:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className={`text-sm font-medium ${getRiskColor(player.bad_actor_score)}`}>
                    {formatNumber(player.bad_actor_score)}
                  </span>
                </td>
                <td className="hidden 2xl:table-cell px-2 sm:px-4 py-3 text-center">
                  <span className={`text-sm ${getRiskColor(player.intention_score)}`}>
                    {formatNumber(player.intention_score)}
                  </span>
                </td>
                
                {/* Actions */}
                <td className="px-2 sm:px-4 py-3 text-right">
                  <Link
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-indigo-400 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Empty State */}
      {stats.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-300">No players found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}
    </div>
  );
} 
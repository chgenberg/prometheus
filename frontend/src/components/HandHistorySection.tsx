import React, { useState, useEffect } from 'react';
import { Database, Activity, Users, DollarSign, Clock, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Types for real hand history data
interface RealHandAction {
  hand_id: string;
  player_id: string;
  position: string;
  street: string;
  action_type: string;
  amount: number;
  hole_cards: string;
  community_cards: string;
  pot_before: number;
  money_won: number;
  stakes: string;
  player_intention: string;
  timestamp: string;
}

interface HandHistoryStats {
  total_hands: number;
  total_actions: number;
  players_analyzed: number;
  money_stats: {
    average_pot_size: number;
  };
}

interface Props {
  playerName?: string;
  hands?: RealHandAction[];
  totalHands: number;
}

export default function HandHistorySection({ playerName, hands = [], totalHands }: Props) {
  const [handHistory, setHandHistory] = useState<RealHandAction[]>(hands);
  const [stats, setStats] = useState<HandHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHandHistory();
  }, []);

  const fetchHandHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hand-history?limit=50${playerName ? `&playerName=${playerName}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch hand history');
      
      const data = await response.json();
      setHandHistory(data.hand_history || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching hand history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'raise': return 'text-red-400 bg-red-500/10';
      case 'call': return 'text-green-400 bg-green-500/10';
      case 'fold': return 'text-gray-400 bg-gray-500/10';
      case 'check': return 'text-blue-400 bg-blue-500/10';
      case 'bet': return 'text-orange-400 bg-orange-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getStreetColor = (street: string) => {
    switch (street.toUpperCase()) {
      case 'PREFLOP': return 'text-yellow-400 bg-yellow-500/10';
      case 'FLOP': return 'text-blue-400 bg-blue-500/10';
      case 'TURN': return 'text-green-400 bg-green-500/10';
      case 'RIVER': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-400">Loading real hand history data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-red-400">
          <X className="h-5 w-5" />
          <span>Error loading hand history: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
            🎯 Real Hand History Analysis
            <span className="ml-3 text-sm bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
              Live Data
            </span>
          </h3>
          <p className="text-gray-400">
            {stats ? `${stats.total_actions.toLocaleString()} actions from ${totalHands.toLocaleString()} hands by ${stats.players_analyzed} players` : 'Loading statistics...'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 p-4 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-blue-400">Total Hands</p>
                <p className="text-xl font-bold text-white">{totalHands.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 p-4 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-green-400">Total Actions</p>
                <p className="text-xl font-bold text-white">{stats.total_actions.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 p-4 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-purple-400">Players</p>
                <p className="text-xl font-bold text-white">{stats.players_analyzed}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 p-4 rounded-xl border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-yellow-400">Avg Pot</p>
                <p className="text-xl font-bold text-white">${stats.money_stats.average_pot_size.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hand History Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Hand ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Player</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Position</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Street</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Pot</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Cards</th>
            </tr>
          </thead>
          <tbody>
            {handHistory.slice(0, 20).map((hand, index) => (
              <tr
                key={`${hand.hand_id}-${index}`}
                className="border-b border-gray-800/50 hover:bg-gray-700/20 transition-colors"
              >
                <td className="py-3 px-4">
                  <code className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                    {hand.hand_id.substring(0, 12)}...
                  </code>
                </td>
                <td className="py-3 px-4">
                  <span className="text-blue-400 text-xs">
                    {hand.player_id.replace('coinpoker/', '')}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-yellow-400 font-medium">
                    {hand.position}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStreetColor(hand.street)}`}>
                    {hand.street}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(hand.action_type)}`}>
                    {hand.action_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-white font-mono">
                  {hand.amount > 0 ? `$${hand.amount}` : '-'}
                </td>
                <td className="py-3 px-4 text-gray-300 font-mono">
                  ${hand.pot_before}
                </td>
                <td className="py-3 px-4">
                  {hand.hole_cards ? (
                    <code className="text-xs text-purple-400 bg-gray-800/50 px-2 py-1 rounded">
                      {hand.hole_cards}
                    </code>
                  ) : (
                    <span className="text-gray-500 text-xs">Hidden</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/30 text-center">
        <div className="text-sm text-gray-400">
          Showing latest {handHistory.length} actions from real poker hands
        </div>
        <button
          onClick={fetchHandHistory}
          className="mt-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
} 
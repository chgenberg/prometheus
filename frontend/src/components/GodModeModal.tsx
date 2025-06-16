import React, { useState, useEffect } from 'react';
import { X, Shield, BrainCircuit, BarChart, FileText } from 'lucide-react';

// Types to match the API response
interface BotScoreResult {
    player_id: string;
    bot_score: number;
    classification: string;
    recommended_action: string;
    raw_scores: Record<string, number>;
}

interface RecentHand {
    hand_id: string;
    timestamp: string;
    position: string;
    hole_cards: string;
    final_action: string;
    pot_size: number;
    win_amount: number;
}

interface GodModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GodModeModal({ isOpen, onClose }: GodModeModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topBots, setTopBots] = useState<BotScoreResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<BotScoreResult | null>(null);
  const [recentHands, setRecentHands] = useState<RecentHand[]>([]);
  const [loadingHands, setLoadingHands] = useState(false);

  const fetchRecentHands = async (playerId: string) => {
    setLoadingHands(true);
    try {
      const response = await fetch(`/api/hand-history?player=${encodeURIComponent(playerId)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const hands: RecentHand[] = data.hands?.map((hand: any) => ({
          hand_id: hand.hand_id || hand.id || 'N/A',
          timestamp: hand.timestamp || hand.created_at || new Date().toISOString(),
          position: hand.position || 'Unknown',
          hole_cards: hand.hole_cards || hand.player_cards || 'Hidden',
          final_action: hand.final_action || hand.action || 'Unknown',
          pot_size: hand.pot_size || hand.final_pot || 0,
          win_amount: hand.win_amount || hand.winnings || 0,
        })) || [];
        setRecentHands(hands);
      } else {
        setRecentHands([]);
      }
    } catch (err) {
      console.error('Failed to fetch recent hands:', err);
      setRecentHands([]);
    } finally {
      setLoadingHands(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const fetchBotScores = async () => {
        setLoading(true);
        setError(null);
        setSelectedPlayer(null);
        setRecentHands([]);
        try {
          const response = await fetch('/api/bot-detection-score');
          if (!response.ok) {
            throw new Error(`Failed to fetch bot scores: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.success) {
            setTopBots(data.results.slice(0, 10)); // Get top 10
          } else {
            throw new Error(data.error || 'Failed to get bot scores.');
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchBotScores();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchRecentHands(selectedPlayer.player_id);
    }
  }, [selectedPlayer]);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score > 80) return 'text-red-400';
    if (score > 60) return 'text-orange-400';
    if (score > 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getClassificationChip = (classification: string) => {
    switch (classification) {
      case 'Kritisk': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'Hög risk': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'Misstänkt': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-gray-900/80 border border-red-800/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-700/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    PROMETHEUS GOD MODE
                </h2>
                <p className="text-sm text-gray-400">Top 10 High-Risk Bot Suspects</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Panel: Top 10 List */}
          <div className="md:col-span-1 bg-gray-950/50 p-4 rounded-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">High-Risk Players</h3>
            {loading && <p className="text-gray-400">Loading suspects...</p>}
            {error && <p className="text-red-400">{error}</p>}
            {!loading && !error && (
              <ul className="space-y-2">
                {topBots.map((bot) => (
                  <li key={bot.player_id}>
                    <button
                      onClick={() => setSelectedPlayer(bot)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${selectedPlayer?.player_id === bot.player_id ? 'bg-red-800/40 border-red-600' : 'bg-gray-800/50 border-gray-700 hover:bg-red-900/20 hover:border-red-700'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">{bot.player_id}</span>
                        <span className={`font-bold ${getScoreColor(bot.bot_score)}`}>{bot.bot_score.toFixed(1)}</span>
                      </div>
                      <div className={`mt-1 text-xs px-2 py-0.5 rounded-full inline-block border ${getClassificationChip(bot.classification)}`}>
                        {bot.classification}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Panel: Player Details */}
          <div className="md:col-span-2 bg-gray-950/50 p-6 rounded-lg border border-gray-700/50">
            {selectedPlayer ? (
                <>
                <h3 className="text-2xl font-bold text-red-400 mb-2">{selectedPlayer.player_id}</h3>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`text-5xl font-bold ${getScoreColor(selectedPlayer.bot_score)}`}>
                        {selectedPlayer.bot_score.toFixed(1)}
                    </div>
                    <div>
                        <div className={`text-xl font-semibold ${getScoreColor(selectedPlayer.bot_score)}`}>{selectedPlayer.classification}</div>
                        <p className="text-gray-400">{selectedPlayer.recommended_action}</p>
                    </div>
                </div>

                <div className="space-y-4">
                  <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-white mb-2"><BarChart className="w-5 h-5 text-yellow-400"/>Raw Score Breakdown</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                          {Object.entries(selectedPlayer.raw_scores).map(([key, value]) => (
                              <div key={key} className="flex justify-between border-b border-gray-800 py-1">
                                  <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span className={`font-medium ${getScoreColor(value * 10)}`}>{value.toFixed(1)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-white mb-2"><FileText className="w-5 h-5 text-green-400"/>Recent Hands</h4>
                      {loadingHands ? (
                        <p className="text-gray-400">Loading recent hands...</p>
                      ) : recentHands.length > 0 ? (
                                                 <div className="space-y-2 max-h-48 overflow-y-auto">
                           {recentHands.map((hand, index) => (
                             <div key={`${selectedPlayer?.player_id}-hand-${index}-${hand.hand_id || 'unknown'}`} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-gray-400">
                                  {new Date(hand.timestamp).toLocaleString()}
                                </span>
                                <span className="text-xs text-blue-400">{hand.position}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex gap-4 text-sm">
                                  <span className="text-white">Cards: <span className="font-mono text-green-400">{hand.hole_cards}</span></span>
                                  <span className="text-gray-300">Action: <span className="text-yellow-400">{hand.final_action}</span></span>
                                </div>
                                <div className="text-right text-sm">
                                  <div className="text-gray-300">Pot: ${hand.pot_size.toLocaleString()}</div>
                                  <div className={`font-medium ${hand.win_amount > 0 ? 'text-green-400' : hand.win_amount < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                    {hand.win_amount > 0 ? '+' : ''}${hand.win_amount.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No recent hands found for this player.</p>
                      )}
                  </div>
                   <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-white mb-2"><BrainCircuit className="w-5 h-5 text-indigo-400"/>OpenAI Analysis (Coming Soon)</h4>
                      <p className="text-gray-500 italic">AI-powered reasoning for the bot score will appear here.</p>
                  </div>
                </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <Shield className="w-16 h-16 text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400">Select a Player</h3>
                    <p className="text-gray-500">Choose a player from the list to view their detailed analysis.</p>
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
} 
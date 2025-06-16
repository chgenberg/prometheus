import React from 'react';
import { X, Activity, PieChart, BarChart3, Target } from 'lucide-react';

interface HandHistoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HandHistoryGuideModal({ isOpen, onClose }: HandHistoryGuideModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Modal sliding from top */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-slideInDown">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl border-b border-gray-700/50 max-w-6xl mx-auto rounded-b-3xl">
          {/* Header */}
          <div className="bg-gray-800/50 backdrop-blur-sm px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center gap-3">
              <PieChart className="h-6 w-6 text-emerald-400" />
              Hand History Analysis Guide
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-110 group"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Pot Type Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                  <span className="text-xl">🎯</span> Pot Type Analysis
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>💰</span> SRP - Single Raised Pot
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Standard preflop raise with callers</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Most common pot type, indicates normal aggression
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🚀</span> 3BP/4BP/5BP - Re-raised Pots
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">3-bet, 4-bet, and 5-bet pots show high aggression</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="text-blue-400">3BP: Common</span>
                      <span className="text-orange-400">4BP: Rare</span>
                      <span className="text-red-400">5BP: Very Rare</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎲</span> LIMP/ISO/WALK
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Special pot types indicating passive or unique play</p>
                    <div className="mt-2 text-xs">
                      <div className="text-green-400">LIMP: Passive entry</div>
                      <div className="text-yellow-400">ISO: Isolation raise</div>
                      <div className="text-gray-400">WALK: Uncontested BB</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Position & Players */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <span className="text-xl">📊</span> Position & Table Dynamics
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🪑</span> Position Distribution
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Frequency of hands played from each position</p>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                      <span className="text-red-400">UTG: Tight</span>
                      <span className="text-yellow-400">MP: Moderate</span>
                      <span className="text-green-400">BTN: Loose</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>👥</span> Player Count Analysis
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">How many players see each street</p>
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">2-3 Players:</span>
                        <span className="text-blue-400">Heads-up/3-way</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">4-5 Players:</span>
                        <span className="text-yellow-400">Multi-way</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">6+ Players:</span>
                        <span className="text-red-400">Family pot</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚔️</span> IP vs OOP Analysis
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">In Position vs Out of Position play</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Position advantage significantly impacts win rates
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Street Progression */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                  <span className="text-xl">🌊</span> Street Progression Analysis
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎴</span> Flop Percentage
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">% of hands that see the flop</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-400">High %:</span> Passive table
                      <span className="text-red-400 ml-2">Low %:</span> Aggressive table
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🔥</span> Turn & River Stats
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Deep street progression patterns</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-gray-300">Turn %: Continuation tendency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-300">River %: Showdown frequency</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>📈</span> Aggression Indicators
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Table aggression level analysis</p>
                    <div className="mt-2 text-xs">
                      <div className="text-green-400">Low flop %: High preflop aggression</div>
                      <div className="text-yellow-400">High river %: Passive calling station</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - How Analysis Works */}
            <div className="mt-6 p-4 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-lg border border-emerald-500/30">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <span className="text-xl">⚡</span> How Hand History Analysis Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p><strong className="text-white">Real Database Analysis:</strong> All statistics come from actual hands stored in heavy_analysis.db</p>
                  <p className="mt-2"><strong className="text-white">Advanced Filters:</strong> Filter by pot type, player count, and more for detailed insights</p>
                </div>
                <div>
                  <p><strong className="text-white">Visual Analytics:</strong> Interactive charts show distributions and trends at a glance</p>
                  <p className="mt-2"><strong className="text-white">Pattern Recognition:</strong> Identify game dynamics and adjust your strategy accordingly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes slideInDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideInDown { animation: slideInDown 0.3s ease-out; }
      `}</style>
    </>
  );
} 
import React from 'react';
import { X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
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
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl border-b border-gray-700/50 max-w-5xl mx-auto rounded-b-3xl">
          {/* Header */}
          <div className="bg-gray-800/50 backdrop-blur-sm px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Player Comparison Guide
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
              {/* Left Column - Performance Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                  <span className="text-xl">📊</span> Performance Metrics
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>💰</span> Win Rate (%)
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Percentage of hands won from database analysis</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="text-red-400">Poor: &lt;30%</span>
                      <span className="text-yellow-400">Average: 30-50%</span>
                      <span className="text-green-400">Good: &gt;50%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎯</span> Net Win (BB/Chips)
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Total winnings in big blinds and chips from real games</p>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🏆</span> Showdown Win (%)
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Win rate when hands go to showdown</p>
                  </div>
                </div>
              </div>

              {/* Middle Column - Playing Style */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <span className="text-xl">🎮</span> Playing Style
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎯</span> VPIP (%)
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Voluntarily Put money In Pot - how often player enters pots</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="text-green-400">Tight: &lt;20%</span>
                      <span className="text-yellow-400">Normal: 20-30%</span>
                      <span className="text-red-400">Loose: &gt;30%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🚀</span> PFR (%)
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Preflop Raise frequency - aggression before flop</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="text-blue-400">Passive: &lt;10%</span>
                      <span className="text-yellow-400">Balanced: 10-20%</span>
                      <span className="text-red-400">Aggressive: &gt;20%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚔️</span> Postflop Aggression
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">How aggressively player bets/raises after flop</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Risk Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                  <span className="text-xl">🛡️</span> Risk Analysis
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎭</span> Skill Scores
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Preflop & Postflop skill analysis (0-100)</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Based on decision quality and timing
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🤝</span> Collusion Score
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Risk of player working with others</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-400">Low: &lt;30</span>
                      <span className="text-red-400 ml-2">High: &gt;70</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🤖</span> Bad Actor Score
                    </h4>
                    <p className="text-gray-300 mt-1 text-xs">Bot/suspicious behavior detection</p>
                    <div className="mt-2 text-xs">
                      <span className="text-green-400">Safe: &lt;40</span>
                      <span className="text-red-400 ml-2">Suspicious: &gt;70</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - How Comparison Works */}
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <span className="text-xl">⚖️</span> How Player Comparison Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p><strong className="text-white">Real Database Analysis:</strong> All statistics come from actual game data stored in our database</p>
                  <p className="mt-2"><strong className="text-white">Live Averages:</strong> Player stats are compared against current database averages</p>
                </div>
                <div>
                  <p><strong className="text-white">Visual Indicators:</strong> Green arrows = above average, Red arrows = below average</p>
                  <p className="mt-2"><strong className="text-white">Multiple Views:</strong> Radar charts, bar charts, and detailed tables for comprehensive analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideInDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slideInDown {
          animation: slideInDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default GuideModal; 
import React from 'react';
import { X, Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

interface SecurityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecurityGuideModal: React.FC<SecurityGuideModalProps> = ({ isOpen, onClose }) => {
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
              <Shield className="h-6 w-6 text-red-500" />
              Bad Actor Detection System
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
              {/* Left Column - What is Bad Actor Detection */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30 p-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span> What is Bad Actor Detection?
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Our AI analyzes real player behavior patterns from the database to identify bots and suspicious accounts. 
                    The system examines volume, win rates, playing patterns, and consistency to detect non-human behavior.
                  </p>
                </div>

                {/* Detection Criteria */}
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30 p-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">📊</span> Detection Criteria
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="bg-gray-900/50 rounded p-2 border border-gray-700/50">
                      <div className="text-red-400 font-semibold">Volume Analysis:</div>
                      <div className="text-gray-300">1000+ hands = +30pts, 700+ hands = +15pts</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2 border border-gray-700/50">
                      <div className="text-orange-400 font-semibold">Win Rate Anomalies:</div>
                      <div className="text-gray-300">60%+ win rate = +40pts, 45%+ = +25pts</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2 border border-gray-700/50">
                      <div className="text-yellow-400 font-semibold">Perfect Play Patterns:</div>
                      <div className="text-gray-300">GTO ratios, textbook ranges = +25-30pts</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Advanced Detection Flags */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30 p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-xl">🤖</span> Advanced Detection Flags
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/30">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-xs">
                        <span className="font-semibold text-white">Inhuman Volume:</span>
                        <span className="text-red-400 ml-1">1500+ hands + 35% win rate = +50pts</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-xs">
                        <span className="font-semibold text-white">Perfect Aggression:</span>
                        <span className="text-orange-400 ml-1">80%+ aggression + 70%+ showdown = +35pts</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-xs">
                        <span className="font-semibold text-white">No Variance:</span>
                        <span className="text-yellow-400 ml-1">Too consistent sessions = +20pts</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded border border-purple-500/30">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-xs">
                        <span className="font-semibold text-white">Robotic Patterns:</span>
                        <span className="text-purple-400 ml-1">Perfect timing + no adaptation = +15-20pts</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Risk Levels */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-lg border border-gray-700/30 p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span> Risk Levels
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-500/10 rounded p-2 border border-red-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <h4 className="text-xs font-bold text-red-400">CRITICAL</h4>
                      </div>
                      <p className="text-xs text-gray-300">100+ Points - Extremely likely bot</p>
                    </div>

                    <div className="bg-orange-500/10 rounded p-2 border border-orange-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <h4 className="text-xs font-bold text-orange-400">HIGH</h4>
                      </div>
                      <p className="text-xs text-gray-300">70-99 Points - Very suspicious</p>
                    </div>

                    <div className="bg-yellow-500/10 rounded p-2 border border-yellow-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <h4 className="text-xs font-bold text-yellow-400">MEDIUM</h4>
                      </div>
                      <p className="text-xs text-gray-300">40-69 Points - Needs monitoring</p>
                    </div>

                    <div className="bg-green-500/10 rounded p-2 border border-green-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <h4 className="text-xs font-bold text-green-400">LOW</h4>
                      </div>
                      <p className="text-xs text-gray-300">0-39 Points - Likely human</p>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center text-gray-400 text-xs">
                  <p className="flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" />
                    Live analysis of real database player statistics
                  </p>
                  <p className="mt-1 text-gray-500">
                    Multiple flags increase confidence • Human patterns reduce scores
                  </p>
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

export default SecurityGuideModal; 
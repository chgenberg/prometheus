import React, { useState, useEffect } from 'react';
import PlayerDashboard from '@/components/PlayerDashboard';
import GodModeBotHunter from '@/components/GodModeBotHunter';
import { Shield, ChevronDown, ChevronUp, Database, Search, Filter, Target, Users, CheckSquare, Square } from 'lucide-react';
import GodModeModal from './GodModeModal';

export default function UnifiedPrometheusAnalytics() {
  const [showGodMode, setShowGodMode] = useState(false);
  const [isGodModeModalOpen, setIsGodModeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  return (
    <div className="space-y-6">
      {/* Enhanced Control Bar */}
      <div className="bg-gradient-to-r from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-6">
          {/* Left side - Status */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 animate-pulse"></div>
              <div className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/40 rounded-xl">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" />
                <span className="text-blue-300 text-sm font-bold uppercase tracking-wide">Bot scores auto-updating</span>
              </div>
            </div>
          </div>

          {/* Right side - God Mode Button */}
          <button
            onClick={() => setIsGodModeModalOpen(true)}
            className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white font-black rounded-xl transition-all shadow-2xl shadow-red-900/50 hover:shadow-red-800/70 transform hover:-translate-y-1 hover:scale-105 border border-red-700/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Shield className="w-6 h-6 relative z-10" />
            <span className="relative z-10 text-base uppercase tracking-wider">PROMETHEUS GOD MODE</span>
          </button>
        </div>
      </div>

      {/* Enhanced Player Database Container */}
      <div className="bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 blur-xl opacity-60"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 rounded-xl border border-blue-400/30">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide">Player Database</h2>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span>Bot Scores calculated automatically via database triggers.</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-600/20 to-green-500/20 rounded-full border border-green-500/40 shadow-lg shadow-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <span className="text-sm text-green-300 font-bold uppercase tracking-wide">Live</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-grow overflow-y-auto bg-gray-900/20">
          <PlayerDashboard />
        </div>
      </div>
      
      {/* God Mode Modal */}
      <GodModeModal 
        isOpen={isGodModeModalOpen}
        onClose={() => setIsGodModeModalOpen(false)}
      />
    </div>
  );
}

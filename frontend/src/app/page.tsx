'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlayerDashboard from '@/components/PlayerDashboard';
import GlobalSecurityOverview from '@/components/GlobalSecurityOverview';
import AdvancedSecurityDashboard from '@/components/AdvancedSecurityDashboard';
import AIPerformanceAnalytics from '@/components/AIPerformanceAnalytics';
import SystemStatusDashboard from '@/components/SystemStatusDashboard';
import DashboardNavigation from '@/components/DashboardNavigation';
import QuickStatsOverview from '@/components/QuickStatsOverview';
import PlayerComparison from '@/components/PlayerComparison';
import RealTimeDashboard from '@/components/RealTimeDashboard';
import VirtualizedPlayerList from '@/components/VirtualizedPlayerList';
import HandHistorySection from '@/components/HandHistorySectionWrapper';
import WinRateAnalysis from '@/components/WinRateAnalysis';
import PostflopAnalysis from '@/components/PostflopAnalysis';
import GodModeBotHunter from '@/components/GodModeBotHunter';
import { FaDatabase, FaInfoCircle, FaSearch } from 'react-icons/fa';
import { GiPokerHand } from 'react-icons/gi';
import { Users, Activity, Database, ChevronRight, TrendingUp, Shield } from 'lucide-react';
import PlayerDetails from '@/components/PlayerDetails';
import QuickPlayerSearch from '@/components/QuickPlayerSearch';
import RefreshButton from '@/components/RefreshButton';
import UnifiedPrometheusAnalytics from '@/components/UnifiedPrometheusAnalytics';


interface SummaryData {
  hand_count: number;
  active_players: number;
}

function HomeContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<SummaryData>({ hand_count: 0, active_players: 0 });
  const [loading, setLoading] = useState(true);
  
  // Get URL parameters using Next.js hooks
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDebugMode = searchParams.get('debug') === 'true';
  const selectedPlayer = searchParams.get('player') || undefined;

  const handlePlayerSelect = (player: any) => {
    router.push(`/?player=${encodeURIComponent(player.player_name)}`);
  };

  useEffect(() => {
    // Fetch summary data
    fetchSummaryData();
  }, []);

  const fetchSummaryData = async () => {
    try {
      // Fetch hand history data for summary
      const handHistoryResponse = await fetch('/api/hand-history');
      const handHistoryData = await handHistoryResponse.json();
      
      // Fetch players data for active count
      const playersResponse = await fetch('/api/players?limit=1');
      const playersData = await playersResponse.json();
      
      setSummary({
        hand_count: handHistoryData.total_hands || 0,
        active_players: playersData.totalCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <QuickStatsOverview />
            <SystemStatusDashboard />
            <GlobalSecurityOverview />
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-8">
            <AdvancedSecurityDashboard />
            <GlobalSecurityOverview />
          </div>
        );
      
      case 'ai-performance':
        return (
          <div className="space-y-8">
            <AIPerformanceAnalytics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WinRateAnalysis />
              <PostflopAnalysis />
            </div>
            
            {/* AI Performance Statistics */}
            <div className="mt-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">🤖 AI Performance Overview</h3>
                <p className="text-gray-400">Advanced AI analysis from 184 CoinPoker players with 137k+ action-level insights</p>
              </div>
              
              {/* Analytics Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 p-4 rounded-lg border border-red-500/20">
                  <div className="text-red-400 text-sm font-medium">🔴 Risk Detection</div>
                  <div className="text-white text-lg font-bold">5,967</div>
                  <div className="text-gray-400 text-xs">Risk events analyzed</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-lg border border-blue-500/20">
                  <div className="text-blue-400 text-sm font-medium">📊 Session Analytics</div>
                  <div className="text-white text-lg font-bold">30,622</div>
                  <div className="text-gray-400 text-xs">Session data points</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/20">
                  <div className="text-purple-400 text-sm font-medium">⚡ Performance Analysis</div>
                  <div className="text-white text-lg font-bold">6,003</div>
                  <div className="text-gray-400 text-xs">Performance metrics</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
                  <div className="text-green-400 text-sm font-medium">🎯 Action Analysis</div>
                  <div className="text-white text-lg font-bold">137,967</div>
                  <div className="text-gray-400 text-xs">Detailed actions</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'player-analysis':
        return (
          <div className="space-y-8">
            <UnifiedPrometheusAnalytics />
          </div>
        );
      
      case 'game-analysis':
        return (
          <div className="space-y-8">
            <HandHistorySection handCount={summary.hand_count} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WinRateAnalysis />
              <PostflopAnalysis />
            </div>
          </div>
        );
      
      case 'monitoring':
        return (
          <div className="space-y-8">
            <RealTimeDashboard />
            <SystemStatusDashboard />
            {isDebugMode && (
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold mb-2">🗄️ Raw Player Database (Debug Mode)</h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FaDatabase className="mr-2 text-blue-600" />
                    Technical Player Database
                  </h2>
                  <VirtualizedPlayerList maxHeight={400} onPlayerSelect={handlePlayerSelect} />
                </div>
              </div>
            )}
          </div>
        );
      

      
      default:
        return (
          <div className="space-y-8">
            <SystemStatusDashboard />
            <GlobalSecurityOverview />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 pattern-bg">
      {/* Header */}
      <header className="backdrop-blur-sm bg-gray-900/80 border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50"></div>
                <GiPokerHand className="relative h-8 w-8 sm:h-12 sm:w-12 text-indigo-500" />
              </div>
              <div>
                <a href="/" className="group cursor-pointer">
                  <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors duration-300">
                    Prometheus <span className="gradient-text hidden sm:inline group-hover:text-indigo-300">Poker Analysis</span>
                  </h1>
                </a>
                <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 sm:gap-2">
                  <FaDatabase className="text-indigo-500 text-xs sm:text-base" />
                  <span className="hidden sm:inline">{summary.hand_count.toLocaleString('en-US')} hands analyzed</span>
                  <span className="sm:hidden">{(summary.hand_count / 1000).toFixed(0)}k hands</span>
                  <span className="text-green-400 ml-2">• {summary.active_players} active players</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDebugMode && (
                <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                  DEBUG MODE
                </span>
              )}
              <RefreshButton />
            </div>
          </div>
        </div>
      </header>

      {/* Prometheus Quote - Only show on homepage */}
      {!selectedPlayer && (
        <div className="bg-gradient-to-r from-red-900/20 via-red-800/30 to-red-900/20 border-b border-red-700/30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="text-center">
              <blockquote className="text-red-400 font-bold text-lg sm:text-xl tracking-widest uppercase">
                "A tyrant's trust dishonors those who earn it."
              </blockquote>
              <cite className="text-red-500/70 text-sm sm:text-base font-medium tracking-wide mt-2 block">
                — Prometheus
              </cite>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8">
        {selectedPlayer ? (
          <div className="space-y-6">
            <PlayerDetails playerName={selectedPlayer} />
          </div>
        ) : (
          <>
            {/* Dashboard Navigation */}
            <DashboardNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Tab Content */}
            {renderTabContent()}

            {/* Debug Mode Toggle Instructions */}
            {!isDebugMode && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-xs">
                  Technical users: Add <code className="bg-gray-800 px-2 py-1 rounded">?debug=true</code> to URL for system monitoring
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-gray-500 text-sm">
        <p>Powered by Prometheus Poker Analytics</p>
        <p className="text-xs mt-1">Advanced AI-driven poker analysis and player insights</p>
      </footer>


    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-lg">Loading PROMETHEUS...</div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}

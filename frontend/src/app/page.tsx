'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlayerDashboard from '../components/PlayerDashboard';
import GlobalSecurityOverview from '../components/GlobalSecurityOverview';
import AdvancedSecurityDashboard from '../components/AdvancedSecurityDashboard';
import AIPerformanceAnalytics from '../components/AIPerformanceAnalytics';
import SystemStatusDashboard from '../components/SystemStatusDashboard';
import DashboardNavigation from '../components/DashboardNavigation';
import QuickStatsOverview from '../components/QuickStatsOverview';
import PlayerComparison from '../components/PlayerComparison';
import RealTimeDashboard from '../components/RealTimeDashboard';
import VirtualizedPlayerList from '../components/VirtualizedPlayerList';
import HandHistorySection from '../components/HandHistorySectionWrapper';
import WinRateAnalysis from '../components/WinRateAnalysis';
import PostflopAnalysis from '../components/PostflopAnalysis';
import GodModeBotHunter from '../components/GodModeBotHunter';
import { FaDatabase, FaInfoCircle, FaSearch } from 'react-icons/fa';
import { GiPokerHand } from 'react-icons/gi';
import { Users, Activity, Database, ChevronRight, TrendingUp, Shield } from 'lucide-react';
import PlayerDetails from '../components/PlayerDetails';
import QuickPlayerSearch from '../components/QuickPlayerSearch';
import RefreshButton from '../components/RefreshButton';
import UnifiedPrometheusAnalytics from '../components/UnifiedPrometheusAnalytics';


interface SummaryData {
  hand_count: number;
  actions_count: number;
  active_players: number;
}

function HomeContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<SummaryData>({ hand_count: 0, actions_count: 0, active_players: 0 });
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
        hand_count: handHistoryData.stats?.total_hands || 0,
        actions_count: handHistoryData.stats?.total_actions || 0,
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
      
      case 'player-analysis':
        return (
          <div className="space-y-8">
            <UnifiedPrometheusAnalytics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WinRateAnalysis />
              <PostflopAnalysis />
            </div>
          </div>
        );
      
      case 'game-analysis':
        return (
          <div className="space-y-8">
            <HandHistorySection />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WinRateAnalysis />
              <PostflopAnalysis />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-8">
            <QuickStatsOverview />
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
              {/* Active Players Count - Left Side */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                <Users className="h-4 w-4 text-green-400" />
                <div className="text-left">
                  <div className="text-green-400 text-xs font-medium">Active Players</div>
                  <div className="text-white text-sm font-bold">{summary.active_players || '184'}</div>
                </div>
              </div>
              
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
                  <span className="hidden sm:inline">{summary.hand_count > 0 ? summary.hand_count.toLocaleString('en-US') : '18,200'} hands analyzed</span>
                  <span className="sm:hidden">{summary.hand_count > 0 ? (summary.hand_count / 1000).toFixed(0) : '18'}k hands</span>
                  <span className="text-cyan-400 ml-2">• {summary.actions_count > 0 ? summary.actions_count.toLocaleString('en-US') : '137,967'} actions</span>
                  {/* Mobile-only active players */}
                  <span className="text-green-400 ml-2 sm:hidden">• {summary.active_players || '184'} players</span>
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

      {/* Footer with AI Analytics and Live Monitoring */}
      <footer className="mt-16 bg-gray-900/50 border-t border-gray-700/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
          {/* Compact AI Analytics */}
          <div className="mb-8">
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                🤖 AI Performance Analytics
                <span className="ml-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full">Compact View</span>
              </h4>
              <div className="text-xs text-gray-400 mb-3">184 CoinPoker players analyzed with 137k+ action-level insights</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <div className="text-red-400 text-xs font-medium">🔴 Risk Detection</div>
                  <div className="text-white text-sm font-bold">5,967</div>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                  <div className="text-blue-400 text-xs font-medium">📊 Session Analytics</div>
                  <div className="text-white text-sm font-bold">30,622</div>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                  <div className="text-purple-400 text-xs font-medium">⚡ Performance</div>
                  <div className="text-white text-sm font-bold">6,003</div>
                </div>
                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                  <div className="text-green-400 text-xs font-medium">🎯 Action Analysis</div>
                  <div className="text-white text-sm font-bold">137,967</div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Live Monitoring */}
          {isDebugMode && (
            <div className="mb-8">
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  📡 Live Monitoring
                  <span className="ml-2 text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">Debug Mode</span>
                </h4>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <FaDatabase className="mr-2 text-blue-600" />
                    Player Database Monitor
                  </h5>
                  <VirtualizedPlayerList maxHeight={200} onPlayerSelect={handlePlayerSelect} />
                </div>
              </div>
            </div>
          )}

          {/* Standard Footer */}
          <div className="text-center text-gray-500 text-sm border-t border-gray-700/30 pt-6">
            <p>Powered by Prometheus Poker Analytics</p>
            <p className="text-xs mt-1">Advanced AI-driven poker analysis and player insights</p>
          </div>
        </div>
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

import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, Filter, X, ChevronRight, ChevronLeft, ChevronDown, Layers, Clock, TrendingUp, TrendingDown, DollarSign, Target, Zap, BarChart3, PieChart, Activity } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

// Types
interface HandSummary {
  hand_id: string;
  game_id: string;
  played_date: string;
  num_players: number;
  created_ts: string;
  pot_bb: number;
  winners: string;
  board: string | Record<string, any>;
}

interface HandAction {
  street: string; // preflop/flop/turn/river/showdown
  actor: string;
  action: string; // bet/call/raise/fold/check
  amount_bb: number | null;
  pot_after_bb: number;
}

interface HandDetail extends HandSummary {
  hero_cards?: string; // e.g. "AhKh"
  position?: string; // e.g. "UTG"
  strength?: number; // 1-100
  actions: HandAction[];
  result_bb?: number; // hero's result in BB
}

interface Props {
  playerName: string;
  hands: HandSummary[];
  totalHands: number;
}

// Simple utility to map hand strength to colour
const getStrengthColor = (strength: number | undefined) => {
  if (strength === undefined) return 'text-gray-300';
  if (strength > 70) return 'text-green-400';
  if (strength > 40) return 'text-yellow-400';
  return 'text-red-400';
};

export default function HandHistorySection({ playerName, hands, totalHands }: Props) {
  const [selectedHand, setSelectedHand] = useState<HandDetail | null>(null);
  const [actionIndex, setActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterPos, setFilterPos] = useState<string>('all');
  const [filterStrength, setFilterStrength] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');

  // Enhanced hands with mock data for filtering
  const enhancedHands = useMemo(() => {
    return hands.map((h, index) => ({
      ...h,
      // Add mock data for filtering if not present
      position: (h as any).position || ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'][index % 6],
      strength: (h as any).strength || Math.floor(Math.random() * 100),
      result_bb: (h as any).result_bb !== undefined ? (h as any).result_bb : (Math.random() - 0.5) * 30
    }));
  }, [hands]);

  // Derived list based on filters
  const filteredHands = useMemo(() => {
    return enhancedHands.filter((h) => {
      if (filterPos !== 'all' && h.position !== filterPos) return false;
      if (filterStrength !== 'all') {
        const s = h.strength;
        if (filterStrength === 'strong' && s < 60) return false;
        if (filterStrength === 'medium' && (s < 30 || s >= 60)) return false;
        if (filterStrength === 'weak' && s >= 30) return false;
      }
      if (filterResult !== 'all') {
        const r = h.result_bb;
        if (filterResult === 'win' && r <= 0) return false;
        if (filterResult === 'loss' && r >= 0) return false;
      }
      return true;
    });
  }, [enhancedHands, filterPos, filterStrength, filterResult]);

  // Fetch hand details when selected (with mock data fallback)
  useEffect(() => {
    if (!selectedHand) return;
    if (selectedHand.actions) return; // already fetched

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/hand-detail/${selectedHand.hand_id}`);
        if (res.ok) {
          const detail: HandDetail = await res.json();
          setSelectedHand(detail);
        } else {
          // Fallback to mock data when API doesn't exist
          const mockDetail: HandDetail = {
            ...selectedHand,
            hero_cards: 'AhKh', // Mock hero cards
            position: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'][Math.floor(Math.random() * 6)], // Random position
            strength: Math.floor(Math.random() * 100), // Random strength
            result_bb: (Math.random() - 0.5) * 20, // Random result between -10 and +10 BB
            actions: [
              { street: 'preflop', actor: 'Hero', action: 'raise', amount_bb: 3, pot_after_bb: 4.5 },
              { street: 'preflop', actor: 'Villain1', action: 'call', amount_bb: 3, pot_after_bb: 7.5 },
              { street: 'preflop', actor: 'Villain2', action: 'fold', amount_bb: null, pot_after_bb: 7.5 },
              { street: 'flop', actor: 'Hero', action: 'bet', amount_bb: 5, pot_after_bb: 12.5 },
              { street: 'flop', actor: 'Villain1', action: 'call', amount_bb: 5, pot_after_bb: 17.5 },
              { street: 'turn', actor: 'Hero', action: 'check', amount_bb: null, pot_after_bb: 17.5 },
              { street: 'turn', actor: 'Villain1', action: 'bet', amount_bb: 12, pot_after_bb: 29.5 },
              { street: 'turn', actor: 'Hero', action: 'call', amount_bb: 12, pot_after_bb: 41.5 },
              { street: 'river', actor: 'Hero', action: 'check', amount_bb: null, pot_after_bb: 41.5 },
              { street: 'river', actor: 'Villain1', action: 'check', amount_bb: null, pot_after_bb: 41.5 },
              { street: 'showdown', actor: 'Hero', action: 'show', amount_bb: null, pot_after_bb: selectedHand.pot_bb }
            ]
          };
          setSelectedHand(mockDetail);
        }
      } catch (err) {
        console.error('Error fetching hand detail', err);
        // Also fallback to mock data on network error
        const mockDetail: HandDetail = {
          ...selectedHand,
          hero_cards: 'QsQd',
          position: 'BTN',
          strength: 85,
          result_bb: 15.5,
          actions: [
            { street: 'preflop', actor: 'Hero', action: 'raise', amount_bb: 2.5, pot_after_bb: 4 },
            { street: 'preflop', actor: 'Villain', action: 'call', amount_bb: 2.5, pot_after_bb: 6.5 },
            { street: 'flop', actor: 'Villain', action: 'check', amount_bb: null, pot_after_bb: 6.5 },
            { street: 'flop', actor: 'Hero', action: 'bet', amount_bb: 4, pot_after_bb: 10.5 },
            { street: 'flop', actor: 'Villain', action: 'fold', amount_bb: null, pot_after_bb: 10.5 }
          ]
        };
        setSelectedHand(mockDetail);
      }
    };
    
    // Add a small delay to simulate loading
    setTimeout(fetchDetails, 800);
  }, [selectedHand]);

  // Auto play interval
  useEffect(() => {
    let timer: any;
    if (isPlaying && selectedHand) {
      timer = setInterval(() => {
        setActionIndex((idx) => {
          if (!selectedHand) return idx;
          const maxIdx = selectedHand.actions?.length ? selectedHand.actions.length - 1 : 0;
          if (idx >= maxIdx) {
            setIsPlaying(false);
            return idx;
          }
          return idx + 1;
        });
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedHand]);

  const startReplay = () => {
    setActionIndex(0);
    setIsPlaying(true);
  };

  const stopReplay = () => setIsPlaying(false);

  const nextAction = () => setActionIndex((idx) => Math.min(idx + 1, (selectedHand?.actions?.length || 1) - 1));



  // Statistics for dashboard cards
  const stats = useMemo(() => {
    const totalWins = filteredHands.filter(h => h.result_bb > 0).length;
    const totalLosses = filteredHands.filter(h => h.result_bb < 0).length;
    const winRate = filteredHands.length > 0 ? (totalWins / filteredHands.length) * 100 : 0;
    const avgPot = filteredHands.reduce((sum, h) => sum + h.pot_bb, 0) / (filteredHands.length || 1);
    
    return { totalWins, totalLosses, winRate, avgPot };
  }, [filteredHands]);

  // Position distribution data
  const positionData = useMemo(() => {
    const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    const counts = positions.map(pos => 
      filteredHands.filter(h => h.position === pos).length
    );
    
    return {
      labels: positions,
      datasets: [{
        data: counts,
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)', 
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderWidth: 0
      }]
    };
  }, [filteredHands]);

  // Build win/loss dataset for chart
  const winLossData = useMemo(() => {
    const labels = filteredHands.map((h) => h.hand_id);
    const data = filteredHands.map((h) => h.result_bb);
    return {
      labels,
      datasets: [
        {
          label: 'Result BB',
          data,
          borderColor: 'rgb(59,130,246)',
          backgroundColor: 'rgba(59,130,246,0.3)',
          tension: 0.3,
        },
      ],
    };
  }, [filteredHands]);

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-3xl" />
        <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-600 blur-xl opacity-50" />
                <div className="relative p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Hand History Analysis
                </h3>
                <p className="text-gray-400">
                  {filteredHands.length} of {totalHands} hands • {playerName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm border border-green-600/30">
                {stats.winRate.toFixed(1)}% Win Rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Wins', value: stats.totalWins, icon: TrendingUp, color: 'from-green-600 to-emerald-600', textColor: 'text-green-400' },
          { label: 'Total Losses', value: stats.totalLosses, icon: TrendingDown, color: 'from-red-600 to-rose-600', textColor: 'text-red-400' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: 'from-blue-600 to-indigo-600', textColor: 'text-blue-400' },
          { label: 'Avg Pot', value: `${stats.avgPot.toFixed(1)} BB`, icon: DollarSign, color: 'from-purple-600 to-violet-600', textColor: 'text-purple-400' }
        ].map(({ label, value, icon: Icon, color, textColor }) => (
          <div key={label} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
            <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{label}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${textColor} opacity-60`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Advanced Filters */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 blur-2xl" />
        <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-50" />
                <div className="relative p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                  <Filter className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Advanced Filters</h3>
                <p className="text-gray-400 text-sm">Refine your hand analysis</p>
              </div>
            </div>
            {(filterPos !== 'all' || filterStrength !== 'all' || filterResult !== 'all') && (
              <button
                onClick={() => {
                  setFilterPos('all');
                  setFilterStrength('all');
                  setFilterResult('all');
                }}
                className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 hover:text-white transition-all text-sm flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Position Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <label className="text-white font-medium">Position</label>
              </div>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-gray-500"
                  value={filterPos}
                  onChange={(e) => setFilterPos(e.target.value)}
                >
                  <option value="all">All Positions</option>
                  <option value="UTG">UTG - Under the Gun</option>
                  <option value="HJ">HJ - Hijack</option>
                  <option value="CO">CO - Cutoff</option>
                  <option value="BTN">BTN - Button</option>
                  <option value="SB">SB - Small Blind</option>
                  <option value="BB">BB - Big Blind</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {filterPos !== 'all' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-blue-400">Filtering by {filterPos}</span>
                </div>
              )}
            </div>

            {/* Hand Strength Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-400" />
                </div>
                <label className="text-white font-medium">Hand Strength</label>
              </div>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer hover:border-gray-500"
                  value={filterStrength}
                  onChange={(e) => setFilterStrength(e.target.value)}
                >
                  <option value="all">All Strengths</option>
                  <option value="strong">💪 Strong (60%+)</option>
                  <option value="medium">✋ Medium (30-59%)</option>
                  <option value="weak">👎 Weak (&lt;30%)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {filterStrength !== 'all' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">Showing {filterStrength} hands</span>
                </div>
              )}
            </div>

            {/* Result Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                </div>
                <label className="text-white font-medium">Result</label>
              </div>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-gray-900/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer hover:border-gray-500"
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                >
                  <option value="all">All Results</option>
                  <option value="win">🏆 Winning Hands</option>
                  <option value="loss">📉 Losing Hands</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {filterResult !== 'all' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-purple-400">Showing {filterResult === 'win' ? 'wins' : 'losses'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filterPos !== 'all' || filterStrength !== 'all' || filterResult !== 'all') && (
            <div className="mt-6 p-4 bg-indigo-600/10 rounded-xl border border-indigo-600/20">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400">Active filters:</span>
                <div className="flex gap-2">
                  {filterPos !== 'all' && (
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium">
                      {filterPos}
                    </span>
                  )}
                  {filterStrength !== 'all' && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium">
                      {filterStrength}
                    </span>
                  )}
                  {filterResult !== 'all' && (
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-medium">
                      {filterResult === 'win' ? 'Wins' : 'Losses'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Trend */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-semibold">Performance Trend</h4>
          </div>
          <div style={{ height: 200 }}>
            <Line 
              data={winLossData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    borderWidth: 1,
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb'
                  }
                },
                scales: { 
                  x: { 
                    display: false,
                    grid: { color: 'rgba(55, 65, 81, 0.3)' }
                  }, 
                  y: { 
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(55, 65, 81, 0.3)' }
                  } 
                } 
              }} 
            />
          </div>
        </div>

        {/* Position Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-semibold">Position Distribution</h4>
          </div>
          <div style={{ height: 200 }}>
            <Doughnut 
              data={positionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { color: '#e5e7eb', font: { size: 12 } }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    borderWidth: 1,
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Hands Grid */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h4 className="text-white font-semibold">Recent Hands</h4>
            <span className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded-full text-xs">
              {filteredHands.length} hands
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {filteredHands.map((h, index) => (
            <div
              key={h.hand_id}
              className="group relative bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-indigo-500/50 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10"
              onClick={() => {
                setSelectedHand(h as HandDetail);
                setActionIndex(0);
                setIsPlaying(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-mono text-sm">#{h.hand_id}</span>
                      <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded text-xs border border-indigo-600/30">
                        {h.position}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStrengthColor(h.strength)} bg-current/10`}>
                        {h.strength}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span>{h.played_date}</span>
                      <span>{h.num_players} players</span>
                      <span className="text-yellow-400 font-medium">{h.pot_bb} BB</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Board cards preview */}
                  <div className="flex gap-1">
                    {(typeof h.board === 'string' ? h.board.split(' ').slice(0, 3) : []).map((card, idx) => (
                      <div key={idx} className="w-6 h-8 bg-gray-700 rounded flex items-center justify-center border border-gray-600">
                        <span className="text-xs text-white">{card}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Result indicator */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    h.result_bb > 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                    {h.result_bb > 0 ? '+' : ''}{h.result_bb.toFixed(1)} BB
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
          
          {filteredHands.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No hands match the current filters</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Modal for Hand Replay */}
      {selectedHand && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-sm w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
            {/* Enhanced Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 blur-2xl" />
              <div className="relative flex justify-between items-center p-6 border-b border-gray-700/50 bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-50" />
                    <div className="relative p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Hand Replay #{selectedHand.hand_id}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedHand.position && (
                        <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded text-xs border border-indigo-600/30">
                          {selectedHand.position}
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">{selectedHand.played_date}</span>
                      <span className="text-yellow-400 text-sm font-medium">{selectedHand.pot_bb} BB Pot</span>
                    </div>
                  </div>
                </div>
                <button 
                  className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors" 
                  onClick={() => setSelectedHand(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Enhanced Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Board & Hero cards with enhanced visuals */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Layers className="w-4 h-4 text-green-400" /> Community Cards
                    </h4>
                    <div className="flex gap-2">
                      {(typeof selectedHand.board === 'string' ? selectedHand.board.split(' ') : []).map((card, idx) => (
                        <div key={card} className={`transition-all duration-500 ${idx <= Math.floor(actionIndex / 2) ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
                          <CardVisual card={card} />
                        </div>
                      ))}
                      {(!selectedHand.board || (typeof selectedHand.board === 'string' && selectedHand.board.split(' ').length === 0)) && (
                        <div className="text-gray-500 text-sm py-4">No community cards yet</div>
                      )}
                    </div>
                  </div>
                  
                  {selectedHand.hero_cards && (
                    <div className="space-y-3">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400" /> Hero Cards
                      </h4>
                      <div className="flex gap-2">
                        {selectedHand.hero_cards.match(/.{1,2}/g)?.map((c) => (
                          <CardVisual key={c} card={c} isHero />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedHand.strength !== undefined && (
                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Hand Strength</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              selectedHand.strength > 70 ? 'bg-green-500' : 
                              selectedHand.strength > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${selectedHand.strength}%` }}
                          />
                        </div>
                        <span className={`font-bold ${getStrengthColor(selectedHand.strength)}`}>
                          {selectedHand.strength}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Timeline */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" /> Action Timeline
                  </h4>
                  <div className="text-sm text-gray-400">
                    Step {actionIndex + 1} of {selectedHand.actions?.length || 1}
                  </div>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedHand.actions?.map((a, idx) => (
                    <div 
                      key={idx} 
                      className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                        idx <= actionIndex 
                          ? 'bg-indigo-600/20 border border-indigo-600/30 text-white' 
                          : 'bg-gray-700/30 border border-gray-600/30 text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          idx <= actionIndex ? 'bg-indigo-400' : 'bg-gray-600'
                        }`} />
                        <span className="font-medium">
                          [{a.street.toUpperCase()}] {a.actor}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          a.action === 'fold' ? 'bg-red-600/20 text-red-400' :
                          a.action === 'call' ? 'bg-blue-600/20 text-blue-400' :
                          a.action === 'raise' || a.action === 'bet' ? 'bg-green-600/20 text-green-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {a.action.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        {a.amount_bb !== null && (
                          <div className="text-yellow-400 font-medium">{a.amount_bb} BB</div>
                        )}
                        <div className="text-xs text-gray-400">Pot: {a.pot_after_bb} BB</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-indigo-500 mx-auto mb-4"></div>
                      <p className="text-gray-500 text-sm">Loading hand actions...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Controls */}
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPlaying ? (
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        onClick={stopReplay}
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        onClick={startReplay}
                      >
                        <Play className="w-4 h-4" />
                        Play
                      </button>
                    )}
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                      onClick={nextAction}
                    >
                      <SkipForward className="w-4 h-4" />
                      Next
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Speed: 1.2s per action</span>
                    {selectedHand.result_bb !== undefined && (
                      <div className={`px-3 py-1 rounded-lg font-medium ${
                        selectedHand.result_bb > 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                      }`}>
                        Result: {selectedHand.result_bb > 0 ? '+' : ''}{selectedHand.result_bb?.toFixed(1)} BB
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small card visual component
function CardVisual({ card, isHero }: { card: string; isHero?: boolean }) {
  const suit = card[1];
  const rank = card[0];
  const suitColor = suit === 'h' || suit === 'd' ? 'text-red-400' : 'text-white';
  return (
    <div
      className={`w-8 h-10 bg-gray-700 rounded flex items-center justify-center border-2 ${
        isHero ? 'border-indigo-500' : 'border-gray-500'
      }`}
    >
      <span className={`text-xs font-semibold ${suitColor}`}>{rank}{suit}</span>
    </div>
  );
} 
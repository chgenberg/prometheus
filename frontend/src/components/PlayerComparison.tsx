"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaUser, FaUsers, FaQuestionCircle, FaCheckSquare, FaRegSquare, FaSearch, FaChartBar, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';
import { IoIosPodium } from 'react-icons/io';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, X, BarChart3, Shield, AlertTriangle } from 'lucide-react';
import { Radar, Bar, Doughnut, Line } from 'react-chartjs-2';
import '../lib/chartConfig';
import GuideModal from './GuideModal';

// --- TYPE DEFINITIONS ---
interface StatsConfig {
  [category: string]: { id: string; label: string }[];
}

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
  intention_score?: number;
  collusion_score?: number;
  bad_actor_score?: number;
  num_players?: number;
  game_type?: string;
}

interface ComparisonData {
  player: PlayerStats | null;
  averages: PlayerStats | null;
}

interface PlayerData {
  [stat: string]: number;
}

// --- CONFIGURATION ---
const statsConfig: StatsConfig = {
  'Performance': [
    { id: 'hands_played', label: 'Hands Played' },
    { id: 'win_rate_percent', label: 'Win Rate (%)' },
    { id: 'net_win_bb', label: 'Net Win (BB)' },
    { id: 'net_win_chips', label: 'Net Win (Chips)' },
    { id: 'showdown_win_percent', label: 'Showdown Win (%)' },
  ],
  'Playing Style': [
    { id: 'preflop_vpip', label: 'VPIP (%)' },
    { id: 'preflop_pfr', label: 'PFR (%)' },
    { id: 'postflop_aggression', label: 'Aggression Factor' },
  ],
  'Skill Scores': [
    { id: 'avg_preflop_score', label: 'Preflop Score' },
    { id: 'avg_postflop_score', label: 'Postflop Score' },
  ],
  'Risk Analysis': [
    { id: 'intention_score', label: 'Intention Score' },
    { id: 'collusion_score', label: 'Collusion Risk' },
    { id: 'bad_actor_score', label: 'Bad Actor Score' },
  ],
};

const allStats = Object.values(statsConfig).flat();

// --- HELPER FUNCTIONS ---
function convertToPlayerData(stats: PlayerStats): PlayerData {
  return {
    hands_played: stats.hands_played || 0,
    net_win_chips: stats.net_win_chips || 0,
    net_win_bb: stats.net_win_bb || 0,
    win_rate_percent: stats.win_rate_percent || 0,
    preflop_vpip: stats.preflop_vpip || 0,
    preflop_pfr: stats.preflop_pfr || 0,
    postflop_aggression: stats.postflop_aggression || 0,
    showdown_win_percent: stats.showdown_win_percent || 0,
    avg_preflop_score: stats.avg_preflop_score || 0,
    avg_postflop_score: stats.avg_postflop_score || 0,
    intention_score: stats.intention_score || 0,
    collusion_score: stats.collusion_score || 0,
    bad_actor_score: stats.bad_actor_score || 0,
    num_players: stats.num_players || 0,
  };
}

// --- SUB-COMPONENTS ---

interface StatisticsSelectorProps {
    selectedStats: string[];
    setSelectedStats: React.Dispatch<React.SetStateAction<string[]>>;
}

const StatisticsSelector: React.FC<StatisticsSelectorProps> = ({ selectedStats, setSelectedStats }) => {
  const toggleStat = (statId: string) => {
    setSelectedStats(prev =>
      prev.includes(statId) ? prev.filter(id => id !== statId) : [...prev, statId]
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Select Statistics to Compare</h3>
        <button 
          onClick={() => setSelectedStats(selectedStats.length > 0 ? [] : allStats.map(s => s.id))}
          className="text-sm px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
        >
          {selectedStats.length > 0 ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(statsConfig).map(([category, stats]) => (
          <div key={category} className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
            <h4 className="font-semibold text-white mb-3">{category}</h4>
            <div className="space-y-2">
              {stats.map(stat => (
                <label key={stat.id} className="flex items-center space-x-2 cursor-pointer text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/30">
                  <input
                    type="checkbox"
                    checked={selectedStats.includes(stat.id)}
                    onChange={() => toggleStat(stat.id)}
                    className="hidden"
                  />
                  {selectedStats.includes(stat.id) ? 
                    <FaCheckSquare className="text-indigo-500 flex-shrink-0" /> : 
                    <FaRegSquare className="text-gray-600 flex-shrink-0" />
                  }
                  <span className="text-sm">{stat.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ComparisonTableProps {
    mainPlayer: PlayerData | null;
    comparePlayer: PlayerData | null;
    averageData: PlayerData | null;
    selectedStats: string[];
    mainPlayerName: string;
    comparePlayerName: string;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ mainPlayer, comparePlayer, averageData, selectedStats, mainPlayerName, comparePlayerName }) => {
    const renderComparison = (playerValue: number | undefined | null, avgValue: number | undefined | null) => {
        if (playerValue === undefined || playerValue === null || avgValue === undefined || avgValue === null) {
            return <span className="text-gray-500">N/A</span>;
        }
        const diff = playerValue - avgValue;
        const isGood = diff > 0;

        return (
            <div className="flex flex-col items-center">
                <div className="text-lg font-semibold text-white mb-1">
                    {playerValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    {diff !== 0 && (
                        <span className={`ml-2 text-sm ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? <TrendingUp className="inline w-4 h-4" /> : <TrendingDown className="inline w-4 h-4" />}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (!mainPlayer) {
      return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm text-center">
          <p className="text-gray-400">Please select a player to see the comparison.</p>
        </div>
      )
    }

    return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-6">Detailed Comparison Table</h3>
            <div className="overflow-x-auto rounded-xl">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-800/50">
                            <th className="p-4 text-left font-semibold text-gray-300">Statistic</th>
                            <th className="p-4 text-center font-semibold text-red-400">{mainPlayerName || 'Main Player'}</th>
                            <th className="p-4 text-center font-semibold text-blue-400">{comparePlayerName || 'Compare With'}</th>
                            <th className="p-4 text-center font-semibold text-purple-400">Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allStats.filter(stat => selectedStats.includes(stat.id)).map((stat, index) => (
                            <tr key={stat.id} className={`border-t border-gray-700/30 hover:bg-gray-800/30 transition-colors ${index % 2 === 0 ? 'bg-gray-900/20' : ''}`}>
                                <td className="p-4 text-gray-300 font-medium">{stat.label}</td>
                                <td className="p-4 text-center">{renderComparison(mainPlayer?.[stat.id], averageData?.[stat.id])}</td>
                                <td className="p-4 text-center">{comparePlayer ? renderComparison(comparePlayer?.[stat.id], averageData?.[stat.id]) : <span className="text-gray-500">-</span>}</td>
                                <td className="p-4 text-center text-gray-400 font-medium">
                                    {averageData?.[stat.id]?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- CHART COMPONENTS ---
interface ChartSectionProps {
  mainPlayer: PlayerData | null;
  comparePlayer: PlayerData | null;
  averageData: PlayerData | null;
  mainPlayerName: string;
  comparePlayerName: string;
}

const PerformanceRadarChart: React.FC<ChartSectionProps> = ({ mainPlayer, comparePlayer, averageData, mainPlayerName, comparePlayerName }) => {
  if (!mainPlayer) return null;

  const data = {
    labels: ['Win Rate %', 'VPIP %', 'PFR %', 'Aggression', 'Showdown Win %'],
    datasets: [
      {
        label: mainPlayerName || 'Main Player',
        data: [
          mainPlayer.win_rate_percent || 0,
          mainPlayer.preflop_vpip || 0,
          mainPlayer.preflop_pfr || 0,
          mainPlayer.postflop_aggression || 0,
          mainPlayer.showdown_win_percent || 0,
        ],
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
      },
      ...(comparePlayer ? [{
        label: comparePlayerName || 'Compare Player',
        data: [
          comparePlayer.win_rate_percent || 0,
          comparePlayer.preflop_vpip || 0,
          comparePlayer.preflop_pfr || 0,
          comparePlayer.postflop_aggression || 0,
          comparePlayer.showdown_win_percent || 0,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      }] : []),
      {
        label: 'Average',
        data: [
          averageData?.win_rate_percent || 0,
          averageData?.preflop_vpip || 0,
          averageData?.preflop_pfr || 0,
          averageData?.postflop_aggression || 0,
          averageData?.showdown_win_percent || 0,
        ],
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderColor: 'rgba(168, 85, 247, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointBackgroundColor: 'rgba(168, 85, 247, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: 'white' },
      },
      title: {
        display: true,
        text: 'Playing Style Overview',
        color: 'white',
        font: { size: 16 },
      },
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: 'rgba(255, 255, 255, 0.7)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', backdropColor: 'transparent' },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
      <div className="h-80">
        <Radar data={data} options={options} />
      </div>
    </div>
  );
};

const RiskAnalysisChart: React.FC<ChartSectionProps> = ({ mainPlayer, comparePlayer, mainPlayerName, comparePlayerName }) => {
  if (!mainPlayer) return null;

  const data = {
    labels: ['Intention Score', 'Collusion Risk', 'Bad Actor Score'],
    datasets: [
      {
        label: mainPlayerName || 'Main Player',
        data: [
          mainPlayer.intention_score || 0,
          mainPlayer.collusion_score || 0,
          mainPlayer.bad_actor_score || 0,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
      ...(comparePlayer ? [{
        label: comparePlayerName || 'Compare Player',
        data: [
          comparePlayer.intention_score || 0,
          comparePlayer.collusion_score || 0,
          comparePlayer.bad_actor_score || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 2,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: 'white' },
      },
      title: {
        display: true,
        text: 'Risk Analysis',
        color: 'white',
        font: { size: 16 },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      y: {
        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

const WinRateProgressChart: React.FC<ChartSectionProps> = ({ mainPlayer, comparePlayer, averageData, mainPlayerName, comparePlayerName }) => {
  if (!mainPlayer) return null;

  const mainWinRate = mainPlayer.win_rate_percent || 0;
  const compareWinRate = comparePlayer?.win_rate_percent || 0;
  const avgWinRate = averageData?.win_rate_percent || 0;

  const getColor = (rate: number) => {
    if (rate > 60) return 'rgb(34, 197, 94)';
    if (rate > 40) return 'rgb(251, 191, 36)';
    return 'rgb(239, 68, 68)';
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Win Rate Comparison
      </h3>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-300">{mainPlayerName || 'Main Player'}</span>
            <span className="text-white font-bold">{mainWinRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${mainWinRate}%`, backgroundColor: getColor(mainWinRate) }}
            />
          </div>
        </div>
        
        {comparePlayer && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">{comparePlayerName || 'Compare Player'}</span>
              <span className="text-white font-bold">{compareWinRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${compareWinRate}%`, backgroundColor: getColor(compareWinRate) }}
              />
            </div>
          </div>
        )}
        
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Average</span>
            <span className="text-gray-400 font-bold">{avgWinRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out bg-purple-500/50"
              style={{ width: `${avgWinRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Player Summary Cards
const PlayerSummaryCard: React.FC<{ player: PlayerData | null; playerName: string; colorClass: string }> = ({ player, playerName, colorClass }) => {
  if (!player) return null;

  const getRiskLevel = (score: number) => {
    if (score > 70) return { text: 'High Risk', color: 'text-red-400' };
    if (score > 40) return { text: 'Medium Risk', color: 'text-yellow-400' };
    return { text: 'Low Risk', color: 'text-green-400' };
  };

  const overallRisk = Math.max(player.intention_score || 0, player.collusion_score || 0, player.bad_actor_score || 0);
  const riskLevel = getRiskLevel(overallRisk);

  return (
    <div className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-${colorClass}-500/30 backdrop-blur-sm`}>
      <h3 className={`text-xl font-semibold text-${colorClass}-400 mb-4`}>{playerName || 'Player'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-sm">Hands Played</p>
                          <p className="text-white text-lg font-bold">{player.hands_played.toLocaleString('en-US')}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Win Rate</p>
          <p className={`text-lg font-bold ${player.win_rate_percent > 50 ? 'text-green-400' : 'text-red-400'}`}>
            {player.win_rate_percent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Net Win BB</p>
          <p className={`text-lg font-bold ${player.net_win_bb > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {player.net_win_bb > 0 ? '+' : ''}{player.net_win_bb.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Risk Level</p>
          <p className={`text-lg font-bold ${riskLevel.color}`}>{riskLevel.text}</p>
        </div>
      </div>
    </div>
  );
};

interface PlayerInputProps {
  label: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  colorClass: string;
  icon: React.ReactNode;
  isRequired?: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ label, playerName, setPlayerName, colorClass, icon, isRequired }) => {
  const [inputValue, setInputValue] = useState(playerName);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.length > 1) {
        fetch(`/api/player-search?q=${encodeURIComponent(inputValue)}&limit=5`)
          .then(res => res.json())
          .then(data => setSuggestions(data))
          .catch(console.error);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below input
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Update parent state on selection or blur
  const handleSelect = (name: string) => {
    setInputValue(name);
    setPlayerName(name);
    setShowSuggestions(false);
  };

  // Handle input focus
  const handleFocus = () => {
    setShowSuggestions(true);
    updateDropdownPosition();
  };
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside container and not on a suggestion item
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Also check if the click is not on a suggestion item
        const suggestionElement = (target as Element).closest('[data-suggestion-dropdown]');
        if (!suggestionElement) {
          setShowSuggestions(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (showSuggestions) {
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showSuggestions]);

  return (
    <>
      <div className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm group hover:border-${colorClass}-500/30 transition-all`} ref={containerRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className={`p-2 bg-${colorClass}-500/10 rounded-lg`}>{icon}</div>
            {label}
          </h3>
          {isRequired && <span className={`text-xs text-gray-500 bg-${colorClass}-500/10 px-2 py-1 rounded-full`}>Required</span>}
        </div>
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              updateDropdownPosition();
            }}
            onBlur={() => setPlayerName(inputValue)}
            onFocus={handleFocus}
            placeholder="Filter by player name..."
            className={`w-full bg-gray-800/50 border-2 border-${colorClass}-500/30 focus:border-${colorClass}-500 focus:ring-2 focus:ring-${colorClass}-500/20 rounded-xl px-10 py-3 text-white placeholder-gray-500 transition-all`}
          />
          {inputValue && <button onClick={() => { setInputValue(''); setPlayerName(''); }} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-500 hover:text-white"/></button>}
        </div>
      </div>
      
      {/* Portal dropdown */}
      {showSuggestions && suggestions.length > 0 && typeof window !== 'undefined' && createPortal(
        <ul 
          data-suggestion-dropdown
          className="fixed bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-auto backdrop-blur-sm"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}
        >
          {suggestions.map(name => (
            <li 
              key={name} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(name);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="px-4 py-2 cursor-pointer hover:bg-gray-800 text-white transition-colors"
            >
              {name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
};

// --- MAIN COMPONENT ---
const PlayerComparison = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mainPlayerName, setMainPlayerName] = useState('');
  const [comparePlayerName, setComparePlayerName] = useState('');
  const [selectedStats, setSelectedStats] = useState(['preflop_vpip', 'preflop_pfr', 'win_rate_percent', 'net_win_bb']);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const [mainPlayerData, setMainPlayerData] = useState<ComparisonData | null>(null);
  const [comparePlayerData, setComparePlayerData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix for hydration error: Ensure server and client initial render match
  useEffect(() => {
    setIsExpanded(false); // Collapse on client side after initial render
  }, []);

  const fetchPlayerData = useCallback(async (playerName: string, setter: React.Dispatch<React.SetStateAction<ComparisonData | null>>) => {
    if (!playerName.trim()) {
      setter(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/player-comparison?player=${encodeURIComponent(playerName)}`);
      if (!response.ok) throw new Error(`Player ${playerName} not found.`);
      const data = await response.json();
      if (!data.player) throw new Error(`Player "${playerName}" not found`);
      setter(data);
    } catch (err: any) {
      setError(err.message);
      setter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayerData(mainPlayerName, setMainPlayerData);
  }, [mainPlayerName, fetchPlayerData]);

  useEffect(() => {
    fetchPlayerData(comparePlayerName, setComparePlayerData);
  }, [comparePlayerName, fetchPlayerData]);
  
  const mainPlayerFormatted = mainPlayerData?.player ? convertToPlayerData(mainPlayerData.player) : null;
  const comparePlayerFormatted = comparePlayerData?.player ? convertToPlayerData(comparePlayerData.player) : null;
  const averageData = mainPlayerData?.averages ? convertToPlayerData(mainPlayerData.averages) : null;
  
  if (!isExpanded) {
    return (
      <div className="mb-8 flex justify-center">
        <div
          onClick={() => setIsExpanded(true)}
          className="group w-full relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/30 p-4 hover:p-6 transition-all duration-500 hover:shadow-2xl hover:border-gray-600/50 cursor-pointer"
        >
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-2 rounded-xl border border-indigo-500/30">
                  <IoIosPodium className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
              <span className="text-white font-medium text-sm group-hover:text-lg transition-all duration-300">
                Player Comparison
              </span>
            </div>
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/30 p-8 mb-8 relative overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
           <div className="relative group"><div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" /><div className="relative bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-4 rounded-2xl border border-indigo-500/30"><IoIosPodium className="h-10 w-10 text-indigo-500" /></div></div>
           <div>
             <div className="flex items-center gap-3">
               <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Player Comparison</h2>
               <button onClick={() => setIsExpanded(false)} className="group p-2 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-110" title="Collapse"><ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-white" /></button>
             </div>
             <div className="flex items-center gap-3 mt-1"><Activity className="w-4 h-4 text-blue-400" /><span className="text-sm text-gray-400">Analyze and compare player statistics</span></div>
           </div>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-medium transition-all text-gray-300 hover:text-white border border-gray-600/30"><FaQuestionCircle className="h-4 w-4" /><span>Guide</span></button>
       </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PlayerInput label="Main Player" playerName={mainPlayerName} setPlayerName={setMainPlayerName} colorClass="red" icon={<FaUser className="h-5 w-5 text-red-500" />} isRequired />
        <PlayerInput label="Compare With" playerName={comparePlayerName} setPlayerName={setComparePlayerName} colorClass="blue" icon={<FaUsers className="h-5 w-5 text-blue-500" />} />
      </div>

      {loading && <div className="text-center text-white">Loading data...</div>}
      {error && <div className="text-center text-red-500 bg-red-500/10 p-3 rounded-lg">{error}</div>}
      
      <div className="relative z-10 space-y-6 mt-8">
        {/* Player Summary Cards */}
        {mainPlayerFormatted && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <PlayerSummaryCard player={mainPlayerFormatted} playerName={mainPlayerName} colorClass="red" />
            {comparePlayerFormatted && (
              <PlayerSummaryCard player={comparePlayerFormatted} playerName={comparePlayerName} colorClass="blue" />
            )}
          </div>
        )}
        
        {/* Charts Section */}
        {mainPlayerFormatted && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <PerformanceRadarChart 
              mainPlayer={mainPlayerFormatted}
              comparePlayer={comparePlayerFormatted}
              averageData={averageData}
              mainPlayerName={mainPlayerName}
              comparePlayerName={comparePlayerName}
            />
            <WinRateProgressChart 
              mainPlayer={mainPlayerFormatted}
              comparePlayer={comparePlayerFormatted}
              averageData={averageData}
              mainPlayerName={mainPlayerName}
              comparePlayerName={comparePlayerName}
            />
          </div>
        )}
        
        {/* Risk Analysis Chart */}
        {mainPlayerFormatted && (
          <RiskAnalysisChart 
            mainPlayer={mainPlayerFormatted}
            comparePlayer={comparePlayerFormatted}
            averageData={averageData}
            mainPlayerName={mainPlayerName}
            comparePlayerName={comparePlayerName}
          />
        )}
        
        {/* Comparison Table */}
        <ComparisonTable 
          mainPlayer={mainPlayerFormatted}
          comparePlayer={comparePlayerFormatted}
          averageData={averageData}
          selectedStats={selectedStats}
          mainPlayerName={mainPlayerName}
          comparePlayerName={comparePlayerName}
        />
        
        {/* Statistics Selector */}
        <StatisticsSelector selectedStats={selectedStats} setSelectedStats={setSelectedStats} />
      </div>

      <GuideModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default PlayerComparison; 
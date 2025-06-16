"use client";

import { useState, useEffect, useCallback } from 'react';
import { FaSlidersH, FaChartLine, FaUser, FaPercent, FaTrophy, FaTrash } from 'react-icons/fa';
import { ChevronDown, ChevronUp, X, Sparkles, Filter, TrendingUp, Users, Activity } from 'lucide-react';

interface AdvancedPlayerFilterProps {
  onFilterChange: (filters: any) => void;
  currentFilters: any;
}

const initialFilterState = {
  playerName: '',
  minHands: '',
  maxHands: '',
  minWinRate: '',
  maxWinRate: '',
  minNetWinBB: '',
  maxNetWinBB: '',
  minVPIP: '',
  maxVPIP: '',
  minPFR: '',
  maxPFR: '',
  minAggression: '',
  maxAggression: '',
  minIntentionScore: '',
  maxIntentionScore: '',
  minBadActorScore: '',
  maxBadActorScore: '',
  minPreflopScore: '',
  maxPreflopScore: '',
  minPostflopScore: '',
  maxPostflopScore: '',
};

const AdvancedPlayerFilter: React.FC<AdvancedPlayerFilterProps> = ({ onFilterChange, currentFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const filterCategories = {
    'Player Info': {
      icon: <FaUser className="w-4 h-4" />,
      color: 'blue',
      filters: [
        { id: 'playerName', label: 'Player Name', type: 'text', placeholder: 'Enter player name...', icon: '👤' },
        { id: 'minHands', label: 'Minimum Hands', type: 'number', placeholder: 'e.g. 100', icon: '🎯' },
        { id: 'maxHands', label: 'Maximum Hands', type: 'number', placeholder: 'e.g. 10000', icon: '📊' },
      ]
    },
    'Performance': {
      icon: <FaTrophy className="w-4 h-4" />,
      color: 'green',
      filters: [
        { id: 'minWinRate', label: 'Min Win Rate (%)', type: 'number', placeholder: 'e.g. 30', icon: '📈' },
        { id: 'maxWinRate', label: 'Max Win Rate (%)', type: 'number', placeholder: 'e.g. 80', icon: '📉' },
        { id: 'minNetWinBB', label: 'Min Net Win (BB)', type: 'number', placeholder: 'e.g. -100', icon: '💰' },
        { id: 'maxNetWinBB', label: 'Max Net Win (BB)', type: 'number', placeholder: 'e.g. 500', icon: '💸' },
      ]
    },
    'Playing Style': {
      icon: <Activity className="w-4 h-4" />,
      color: 'purple',
      filters: [
        { id: 'minVPIP', label: 'Min VPIP (%)', type: 'number', placeholder: 'e.g. 15', icon: '🎲' },
        { id: 'maxVPIP', label: 'Max VPIP (%)', type: 'number', placeholder: 'e.g. 35', icon: '🎰' },
        { id: 'minPFR', label: 'Min PFR (%)', type: 'number', placeholder: 'e.g. 10', icon: '⚡' },
        { id: 'maxPFR', label: 'Max PFR (%)', type: 'number', placeholder: 'e.g. 25', icon: '🔥' },
        { id: 'minAggression', label: 'Min Aggression', type: 'number', placeholder: 'e.g. 1.5', icon: '💪' },
        { id: 'maxAggression', label: 'Max Aggression', type: 'number', placeholder: 'e.g. 4.0', icon: '🚀' },
      ]
    },
    'Security & Risk': {
      icon: <FaChartLine className="w-4 h-4" />,
      color: 'red',
      filters: [
        { id: 'minIntentionScore', label: 'Min Intention Score', type: 'number', placeholder: 'e.g. 0', icon: '🎯' },
        { id: 'maxIntentionScore', label: 'Max Intention Score', type: 'number', placeholder: 'e.g. 100', icon: '⚠️' },
        { id: 'minBadActorScore', label: 'Min Bad Actor Score', type: 'number', placeholder: 'e.g. 0', icon: '🚨' },
        { id: 'maxBadActorScore', label: 'Max Bad Actor Score', type: 'number', placeholder: 'e.g. 100', icon: '🔴' },
      ]
    },
    'Skill Scores': {
      icon: <FaPercent className="w-4 h-4" />,
      color: 'yellow',
      filters: [
        { id: 'minPreflopScore', label: 'Min Preflop Score', type: 'number', placeholder: 'e.g. 0', icon: '🃏' },
        { id: 'maxPreflopScore', label: 'Max Preflop Score', type: 'number', placeholder: 'e.g. 100', icon: '🎴' },
        { id: 'minPostflopScore', label: 'Min Postflop Score', type: 'number', placeholder: 'e.g. 0', icon: '♠️' },
        { id: 'maxPostflopScore', label: 'Max Postflop Score', type: 'number', placeholder: 'e.g. 100', icon: '♥️' },
      ]
    },
  };

  // Debounced filter change for better performance
  const debouncedFilterChange = useCallback(
    debounce((filters: any) => {
      onFilterChange(filters);
    }, 300),
    [onFilterChange]
  );

  const handleInputChange = (filterId: string, value: string | number) => {
    const newFilters = {
      ...currentFilters,
      [filterId]: value
    };
    debouncedFilterChange(newFilters);
  };

  // Debounce utility function
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  const clearFilters = () => {
    const clearedFilters: { [key: string]: any } = {};
    Object.values(filterCategories).forEach(category => {
      category.filters.forEach((filter: any) => {
        clearedFilters[filter.id] = '';
      });
    });
    onFilterChange({
        ...currentFilters,
        ...clearedFilters
    });
  };

  const applyPreset = (presetFilters: Partial<typeof initialFilterState>) => {
    onFilterChange({
      ...currentFilters, // Keep tableSize, gameType, sort etc.
      ...initialFilterState, // Reset all player-specific filters
      ...presetFilters // Apply the new preset filters
    });
  };

  // Count active filters
  useEffect(() => {
    let count = 0;
    Object.values(filterCategories).forEach(category => {
      category.filters.forEach(filter => {
        if (currentFilters[filter.id] && currentFilters[filter.id] !== '') {
          count++;
        }
      });
    });
    setActiveFilters(count);
  }, [currentFilters]);

  const renderFilterInput = (filter: any) => {
    const hasValue = currentFilters[filter.id] && currentFilters[filter.id] !== '';
    
    return (
      <div className="relative group/input">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-transform duration-300 group-focus-within/input:scale-110">
          {filter.icon}
        </div>
        <input
          type={filter.type}
          value={currentFilters[filter.id] || ''}
          onChange={(e) => handleInputChange(filter.id, filter.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          placeholder={filter.placeholder}
          className={`w-full bg-gray-800/50 border-2 rounded-xl pl-10 pr-12 py-3 text-white text-sm 
            focus:outline-none focus:ring-2 transition-all duration-300 placeholder-gray-500
            hover:bg-gray-800/70 focus:bg-gray-800/80
            ${hasValue 
              ? 'border-indigo-500/50 focus:border-indigo-400 focus:ring-indigo-500/20 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' 
              : 'border-gray-600/50 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-gray-500/70'
            }
            group-hover/input:shadow-lg group-hover/input:shadow-indigo-500/10 group-hover/input:border-gray-500/70`}
        />
        {hasValue && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInputChange(filter.id, '');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-all rounded-lg hover:bg-gray-700/50 hover:scale-110 active:scale-95"
          >
            <X size={14} />
          </button>
        )}
        
        {/* Value indicator */}
        {hasValue && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse border-2 border-gray-800" />
        )}
      </div>
    );
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/30 text-blue-400',
      green: 'from-green-500/10 to-green-600/10 border-green-500/30 text-green-400',
      purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/30 text-purple-400',
      red: 'from-red-500/10 to-red-600/10 border-red-500/30 text-red-400',
      yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="relative bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 group overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between">
        {/* Clickable area for expand/collapse */}
        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-lg opacity-40"></div>
            <div className="relative p-2.5 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-xl border border-indigo-500/40">
              <Filter className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                Advanced Player Filter
              </h3>
              {activeFilters > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600/20 to-indigo-500/20 rounded-full border border-indigo-500/40">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  <span className="text-xs font-bold text-indigo-300">{activeFilters} active</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span>Filter players by performance, style, and statistics</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Clear All - only show when there are active filters */}
          {activeFilters > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/40 hover:to-red-600/40 rounded-xl text-red-400 hover:text-red-300 transition-all flex items-center gap-2 border border-red-500/30 hover:border-red-400/50 hover:scale-105 active:scale-95"
            >
              <X size={14} />
              Clear All
            </button>
          )}
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 hover:bg-gray-700/50 rounded-xl transition-all group/btn hover:scale-110 active:scale-95"
          >
            {isExpanded ? 
              <ChevronUp className="h-5 w-5 text-gray-400 group-hover/btn:text-white transition-colors" /> : 
              <ChevronDown className="h-5 w-5 text-gray-400 group-hover/btn:text-white transition-colors" />
            }
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="relative mt-8 space-y-8 animate-slideDown">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minWinRate: '50' });
                }}
                className="quick-action-btn border-green-500/50 bg-green-900/20 text-green-400 hover:bg-green-800/40"
              >
                <FaTrophy className="w-4 h-4" /> Winners Only (WR ≥ 50%)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minHands: '1000', minVPIP: '20', maxVPIP: '30' });
                }}
                className="quick-action-btn border-blue-500/50 bg-blue-900/20 text-blue-400 hover:bg-blue-800/40"
              >
                <Users className="w-4 h-4" /> Regulars (1k+ hands)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minVPIP: '35', minPFR: '25' });
                }}
                className="quick-action-btn border-red-500/50 bg-red-900/20 text-red-400 hover:bg-red-800/40"
              >
                <TrendingUp className="w-4 h-4" /> Aggressive Players
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minHands: '500', maxHands: '2000' });
                }}
                className="quick-action-btn border-purple-500/50 bg-purple-900/20 text-purple-400 hover:bg-purple-800/40"
              >
                <Activity className="w-4 h-4" /> Mid-Volume (500-2k)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minIntentionScore: '70' });
                }}
                className="quick-action-btn border-yellow-500/50 bg-yellow-900/20 text-yellow-400 hover:bg-yellow-800/40"
              >
                <FaChartLine className="w-4 h-4" /> High Risk (Intent ≥ 70)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minPreflopScore: '80', minPostflopScore: '80' });
                }}
                className="quick-action-btn border-indigo-500/50 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-800/40"
              >
                <FaPercent className="w-4 h-4" /> High Skill (Score ≥ 80)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minHands: '100', maxVPIP: '20', minPFR: '15' });
                }}
                className="quick-action-btn border-cyan-500/50 bg-cyan-900/20 text-cyan-400 hover:bg-cyan-800/40"
              >
                <FaUser className="w-4 h-4" /> Tight Players
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyPreset({ minBadActorScore: '50' });
                }}
                className="quick-action-btn border-orange-500/50 bg-orange-900/20 text-orange-400 hover:bg-orange-800/40"
              >
                <FaSlidersH className="w-4 h-4" /> Suspicious (Bad Actor ≥ 50)
              </button>
            </div>
          </div>
          
          {Object.entries(filterCategories).map(([categoryName, category]) => (
            <div 
              key={categoryName} 
              className="space-y-4"
              onMouseEnter={() => setHoveredCategory(categoryName)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <div className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border transition-all duration-500 ${
                hoveredCategory === categoryName 
                  ? `bg-gradient-to-r ${getColorClasses(category.color)} shadow-xl border-opacity-70 transform scale-[1.02]` 
                  : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
              }`}>
                {/* Animated background shimmer */}
                {hoveredCategory === categoryName && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer" />
                )}
                
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  hoveredCategory === categoryName 
                    ? 'bg-white/15 shadow-lg transform scale-110' 
                    : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                }`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white">
                      {categoryName}
                    </h4>
                    <div className="text-xs text-gray-400">
                      {category.filters.filter(f => currentFilters[f.id] && currentFilters[f.id] !== '').length}/{category.filters.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">
                      {category.filters.length} filters available
                    </p>
                    {/* Progress bar */}
                    <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          hoveredCategory === categoryName ? 'bg-gradient-to-r from-indigo-400 to-purple-400' : 'bg-gray-600'
                        }`}
                        style={{ 
                          width: `${(category.filters.filter(f => currentFilters[f.id] && currentFilters[f.id] !== '').length / category.filters.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.filters.map((filter: any) => (
                  <div key={filter.id} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <span className="text-base">{filter.icon}</span>
                      {filter.label}
                    </label>
                    {renderFilterInput(filter)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.5s ease-out forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .quick-action-btn {
          @apply flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 border hover:scale-105 active:scale-95 hover:shadow-lg;
        }
      `}</style>
    </div>
  );
};

export default AdvancedPlayerFilter; 
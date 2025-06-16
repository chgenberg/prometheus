"use client";

import { FaTrophy, FaCoins, FaUsers } from 'react-icons/fa';
import { GiCardAceSpades } from 'react-icons/gi';

interface FilterControlsProps {
  onFilterChange: (filters: { tableSize?: string; gameType?: string; [key: string]: any; }) => void;
  currentFilters: {
    tableSize: string;
    gameType: string;
    [key: string]: any;
  };
}

export default function FilterControls({ onFilterChange, currentFilters }: FilterControlsProps) {
  const handleFilterChange = (filterType: string, value: string) => {
    onFilterChange({ [filterType]: value });
  };

  const tableSizeOptions = [
    { label: '6-Max', value: '6', icon: '6' },
    { label: '5-Max', value: '5', icon: '5' },
    { label: '4-Max', value: '4', icon: '4' },
    { label: '3-Max', value: '3', icon: '3' },
    { label: 'Heads-Up', value: '2', icon: '2' },
    { label: 'All Sizes', value: 'all', icon: <FaUsers /> },
  ];

  const gameTypeOptions = [
    { label: 'Tournament', value: 'tournament', icon: <FaTrophy /> },
    { label: 'Cash Games', value: 'cash', icon: <FaCoins /> },
    { label: 'All Games', value: 'all', icon: <GiCardAceSpades /> },
  ];

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6 space-y-6">
      {/* Game Type Filter */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg">
            <GiCardAceSpades className="text-indigo-400 text-base" />
          </div>
          GAME TYPE
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {gameTypeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange('gameType', option.value)}
              className={`
                px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                flex items-center justify-center gap-2 relative overflow-hidden
                ${currentFilters.gameType === option.value
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border border-gray-700/50'
                }
              `}
            >
              <span className="text-base">{option.icon}</span>
              <span>{option.label}</span>
              {currentFilters.gameType === option.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-transparent animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table Size Filter */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-green-500/20 rounded-lg">
            <FaUsers className="text-green-400 text-base" />
          </div>
          TABLE SIZE
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {tableSizeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange('tableSize', option.value)}
              className={`
                px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                flex items-center justify-center gap-2 relative overflow-hidden
                ${currentFilters.tableSize === option.value
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25 scale-105'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border border-gray-700/50'
                }
              `}
            >
              {typeof option.icon === 'string' ? (
                <span className="text-lg font-bold">{option.icon}</span>
              ) : (
                <span className="text-base">{option.icon}</span>
              )}
              <span>{option.label}</span>
              {currentFilters.tableSize === option.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 
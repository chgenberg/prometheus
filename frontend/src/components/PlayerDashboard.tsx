"use client";

import { useState, useEffect, useMemo } from 'react';
import { usePlayerStats } from '../hooks/usePlayerStats';
import FilterControls from './FilterControls';
import PlayerStatsTable from '../app/ui/PlayerStatsTable';
import PaginationControls from '../app/ui/PaginationControls';
import { FaExclamationTriangle } from 'react-icons/fa';
import AdvancedPlayerFilter from './AdvancedPlayerFilter';
import QuickPlayerSearch from './QuickPlayerSearch';

interface BotScoreResult {
    player_id: string;
    bot_score: number;
    classification: string;
}

export default function PlayerDashboard() {
  const [filters, setFilters] = useState({
    tableSize: 'all',
    gameType: 'all',
    page: 0,
    sortBy: 'net_win_chips',
    sortOrder: 'desc' as 'asc' | 'desc',
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
  });

  const { data, isLoading, error } = usePlayerStats({
    ...filters,
    minHands: filters.minHands ? Number(filters.minHands) : undefined,
    maxHands: filters.maxHands ? Number(filters.maxHands) : undefined,
    minWinRate: filters.minWinRate ? Number(filters.minWinRate) : undefined,
    maxWinRate: filters.maxWinRate ? Number(filters.maxWinRate) : undefined,
    minNetWinBB: filters.minNetWinBB ? Number(filters.minNetWinBB) : undefined,
    maxNetWinBB: filters.maxNetWinBB ? Number(filters.maxNetWinBB) : undefined,
    minVPIP: filters.minVPIP ? Number(filters.minVPIP) : undefined,
    maxVPIP: filters.maxVPIP ? Number(filters.maxVPIP) : undefined,
    minPFR: filters.minPFR ? Number(filters.minPFR) : undefined,
    maxPFR: filters.maxPFR ? Number(filters.maxPFR) : undefined,
    minAggression: filters.minAggression ? Number(filters.minAggression) : undefined,
    maxAggression: filters.maxAggression ? Number(filters.maxAggression) : undefined,
  });

  // Debug logging to see if bot scores are included
  useEffect(() => {
    if (data?.players) {
      console.log('PlayerDashboard received data:', {
        playersCount: data.players.length,
        firstPlayerBotScore: (data.players[0] as any)?.bot_score,
        samplePlayer: data.players[0]
      });
    }
  }, [data]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.tableSize || newFilters.gameType || newFilters.playerName ? 0 : prev.page
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page: page - 1 }));
  };

  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const handlePlayerNameFilter = (playerName: string) => {
    setFilters(prev => ({ ...prev, playerName, page: 0 }));
  };


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400 bg-red-900/20 rounded-lg">
        <FaExclamationTriangle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Error Loading Data</h2>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <>
      <FilterControls 
        onFilterChange={handleFilterChange}
        currentFilters={filters}
      />
      
      <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-6">
        <AdvancedPlayerFilter
          onFilterChange={handleFilterChange}
          currentFilters={filters}
        />

        <div className="my-4">
          <QuickPlayerSearch />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-16">
            <div className="spinner mb-4"></div>
            <span className="text-gray-400 animate-pulse text-sm sm:text-base">Loading player statistics...</span>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center space-y-1">
              <div>
                <p className="text-xs text-gray-500 xl:hidden">
                  Showing core columns. Use larger screen for full details.
                </p>
                <p className="text-xs text-gray-500 hidden xl:block 2xl:hidden">
                  Showing extended view. Use wider screen for risk analysis.
                </p>
                <p className="text-xs text-gray-500 hidden 2xl:block">
                  Full table view with all columns
                </p>
              </div>
              {data && typeof data.total === 'number' && (
                <p className="text-sm text-indigo-400 font-medium">
                  {`Found ${data.total.toLocaleString('en-US')} matching ${data.total === 1 ? 'player' : 'players'}`}
                </p>
              )}
            </div>
            <PlayerStatsTable 
              stats={data?.players || []}
              onSort={handleSort}
              onPlayerNameFilter={handlePlayerNameFilter}
              currentSort={{ sortBy: filters.sortBy, sortOrder: filters.sortOrder }}
              playerNameFilter={filters.playerName}
            />
            
            {data && (
              <PaginationControls
                totalItems={data.total}
                itemsPerPage={50}
                currentPage={data.page + 1}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </>
  );
} 
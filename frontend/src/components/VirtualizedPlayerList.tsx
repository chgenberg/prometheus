'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Search, TrendingUp, TrendingDown, Users, Activity } from 'lucide-react';

interface Player {
  id: number;
  player_name: string;
  hands_played: number;
  win_rate_percent: number;
  net_win_bb: number;
  preflop_vpip: number;
  preflop_pfr: number;
  postflop_aggression: number;
  showdown_win_percent: number;
  last_updated?: string;
}

interface VirtualizedPlayerListProps {
  onPlayerSelect?: (player: Player) => void;
  maxHeight?: number;
}

const ITEM_HEIGHT = 80;
const ITEMS_PER_PAGE = 50;

export default function VirtualizedPlayerList({ 
  onPlayerSelect, 
  maxHeight = 600 
}: VirtualizedPlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof Player>('hands_played');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filtered and sorted players
  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(player =>
      player.player_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return filtered;
  }, [players, searchTerm, sortBy, sortOrder]);

  // Load players with pagination
  const loadPlayers = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/players?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      
      if (!response.ok) {
        throw new Error('Failed to load players');
      }
      
      const data = await response.json();
      
      if (reset) {
        setPlayers(data.players || []);
      } else {
        setPlayers(prev => [...prev, ...(data.players || [])]);
      }
      
      setTotalCount(data.totalCount || 0);
      setHasNextPage(data.hasNextPage || false);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, sortBy, sortOrder, loading]);

  // Initial load
  useEffect(() => {
    loadPlayers(0, true);
  }, [searchTerm, sortBy, sortOrder]);

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!filteredPlayers[index];
  }, [filteredPlayers]);

  // Load more items
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (!hasNextPage || loading) return;
    
    const page = Math.floor(startIndex / ITEMS_PER_PAGE);
    await loadPlayers(page);
  }, [hasNextPage, loading, loadPlayers]);

  // Handle sort change
  const handleSort = (field: keyof Player) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Render individual player row
  const PlayerRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const player = filteredPlayers[index];
    
    if (!player) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="animate-pulse flex space-x-4 w-full">
            <div className="rounded-full bg-gray-300 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      );
    }

    const winRateColor = player.win_rate_percent > 0 ? 'text-green-600' : 'text-red-600';
    const winRateIcon = player.win_rate_percent > 0 ? TrendingUp : TrendingDown;
    const WinRateIcon = winRateIcon;

    return (
      <div 
        style={style} 
        className="flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onPlayerSelect?.(player)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {player.player_name}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500 flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {player.hands_played.toLocaleString('en-US')} hands
                </span>
                <span className={`text-xs flex items-center ${winRateColor}`}>
                  <WinRateIcon className="w-3 h-3 mr-1" />
                  {player.win_rate_percent.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  {player.net_win_bb > 0 ? '+' : ''}{player.net_win_bb} BB
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                VPIP: {player.preflop_vpip.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                PFR: {player.preflop_pfr.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Players ({totalCount.toLocaleString('en-US')})
          </h2>
          <div className="text-sm text-gray-500">
            {loading && 'Loading...'}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'hands_played', label: 'Hands' },
            { key: 'win_rate_percent', label: 'Win Rate' },
            { key: 'net_win_bb', label: 'Profit' },
            { key: 'player_name', label: 'Name' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key as keyof Player)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                sortBy === key
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label} {sortBy === key && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          ))}
        </div>
      </div>

      {/* Virtualized List */}
      <div style={{ height: maxHeight }}>
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={hasNextPage ? filteredPlayers.length + 1 : filteredPlayers.length}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered, ref }: any) => (
            <List
              ref={ref}
              height={maxHeight}
              width="100%"
              itemCount={hasNextPage ? filteredPlayers.length + 1 : filteredPlayers.length}
              itemSize={ITEM_HEIGHT}
              onItemsRendered={onItemsRendered}
            >
              {PlayerRow}
            </List>
          )}
        </InfiniteLoader>
      </div>
    </div>
  );
} 
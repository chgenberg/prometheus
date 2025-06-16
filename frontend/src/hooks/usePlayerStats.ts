import { useState, useEffect } from 'react';

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
  flop_score?: number;
  turn_score?: number;
  river_score?: number;
  intention_score?: number;
  collusion_score?: number;
  bad_actor_score?: number;
  bot_score?: number;
  num_players?: number;
  game_type?: string;
  last_updated?: string;
}

interface PlayerStatsResponse {
  players: PlayerStats[];
  total: number;
  page: number;
  hasNextPage: boolean;
}

interface UsePlayerStatsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  playerName?: string;
  minHands?: number;
  maxHands?: number;
  minWinRate?: number;
  maxWinRate?: number;
  minNetWinBB?: number;
  maxNetWinBB?: number;
  minVPIP?: number;
  maxVPIP?: number;
  minPFR?: number;
  maxPFR?: number;
  minAggression?: number;
  maxAggression?: number;
  tableSize?: string;
  gameType?: string;
}

export function usePlayerStats(params: UsePlayerStatsParams = {}) {
  const [data, setData] = useState<PlayerStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        
        // Add pagination params
        if (params.page !== undefined) queryParams.set('page', params.page.toString());
        if (params.limit !== undefined) queryParams.set('limit', params.limit.toString());
        
        // Add sorting params  
        if (params.sortBy) queryParams.set('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
        
        // Add filter params
        if (params.playerName) queryParams.set('playerName', params.playerName);
        if (params.minHands !== undefined) queryParams.set('minHands', params.minHands.toString());
        if (params.maxHands !== undefined) queryParams.set('maxHands', params.maxHands.toString());
        if (params.minWinRate !== undefined) queryParams.set('minWinRate', params.minWinRate.toString());
        if (params.maxWinRate !== undefined) queryParams.set('maxWinRate', params.maxWinRate.toString());
        if (params.minNetWinBB !== undefined) queryParams.set('minNetWinBB', params.minNetWinBB.toString());
        if (params.maxNetWinBB !== undefined) queryParams.set('maxNetWinBB', params.maxNetWinBB.toString());
        if (params.minVPIP !== undefined) queryParams.set('minVPIP', params.minVPIP.toString());
        if (params.maxVPIP !== undefined) queryParams.set('maxVPIP', params.maxVPIP.toString());
        if (params.minPFR !== undefined) queryParams.set('minPFR', params.minPFR.toString());
        if (params.maxPFR !== undefined) queryParams.set('maxPFR', params.maxPFR.toString());
        if (params.minAggression !== undefined) queryParams.set('minAggression', params.minAggression.toString());
        if (params.maxAggression !== undefined) queryParams.set('maxAggression', params.maxAggression.toString());
        if (params.tableSize && params.tableSize !== 'all') queryParams.set('tableSize', params.tableSize);
        if (params.gameType && params.gameType !== 'all') queryParams.set('gameType', params.gameType);

        const response = await fetch(`/api/players?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch player stats: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerStats();
  }, [
    params.page,
    params.limit,
    params.sortBy,
    params.sortOrder,
    params.playerName,
    params.minHands,
    params.maxHands,
    params.minWinRate,
    params.maxWinRate,
    params.minNetWinBB,
    params.maxNetWinBB,
    params.minVPIP,
    params.maxVPIP,
    params.minPFR,
    params.maxPFR,
    params.minAggression,
    params.maxAggression,
    params.tableSize,
    params.gameType,
  ]);

  return { data, isLoading, error };
} 
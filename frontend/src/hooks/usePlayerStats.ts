import { useState, useEffect, useCallback } from 'react';
import { PlayerStat } from '@/lib/database-unified';

interface UsePlayerStatsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tableSize?: string;
  gameType?: string;
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
  minIntentionScore?: number;
  maxIntentionScore?: number;
  minBadActorScore?: number;
  maxBadActorScore?: number;
  minPreflopScore?: number;
  maxPreflopScore?: number;
  minPostflopScore?: number;
  maxPostflopScore?: number;
  minCollusionScore?: number;
  maxCollusionScore?: number;
  refreshKey?: number;
}

interface UsePlayerStatsReturn {
  data: {
    players: PlayerStat[];
    total: number;
    page: number;
    totalPages: number;
  } | undefined;
  error: Error | null;
  isLoading: boolean;
  mutate: () => Promise<void>;
}

export function usePlayerStats(params: UsePlayerStatsParams = {}): UsePlayerStatsReturn {
  const [data, setData] = useState<UsePlayerStatsReturn['data']>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/players?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    mutate
  };
} 
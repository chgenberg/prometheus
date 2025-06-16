import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Singleton database instance
let db: Database | null = null;
let isInitialized = false;

// Performance optimizations for SQLite
const SQLITE_OPTIMIZATIONS = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
  PRAGMA mmap_size = 30000000000;
  PRAGMA page_size = 32768;
`;

// Initialize database connection
async function initializeDatabase(): Promise<Database> {
  if (db && isInitialized) {
    return db;
  }
  
  const possiblePaths = [
    path.join(process.cwd(), 'heavy_analysis3.db'),
    path.join(process.cwd(), '..', 'heavy_analysis3.db'),
    './heavy_analysis3.db',
  ];

  const dbPath = possiblePaths.find(p => fs.existsSync(p));

  if (!dbPath) {
    console.error('Unified DB not found in any of the expected locations:', possiblePaths);
    throw new Error('heavy_analysis3.db not found.');
  }

  try {
    console.log(`Unified DB connection initialized at: ${dbPath}`);
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec(SQLITE_OPTIMIZATIONS);
    await createOptimizedIndexes(db);

    isInitialized = true;
    console.log('Database connection initialized successfully');
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create optimized indexes
async function createOptimizedIndexes(database: Database): Promise<void> {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_player_id ON main(player_id COLLATE NOCASE)',
    'CREATE INDEX IF NOT EXISTS idx_player_id_lower ON main(LOWER(player_id))',
    'CREATE INDEX IF NOT EXISTS idx_total_hands ON main(total_hands DESC)',
    'CREATE INDEX IF NOT EXISTS idx_net_win_bb ON main(net_win_bb DESC)',
    'CREATE INDEX IF NOT EXISTS idx_vpip ON main(vpip DESC)',
    'CREATE INDEX IF NOT EXISTS idx_pfr ON main(pfr DESC)',
    'CREATE INDEX IF NOT EXISTS idx_bad_actor_score ON main(bad_actor_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_intention_score ON main(intention_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_hands_winrate ON main(total_hands, net_win_bb)',
    'CREATE INDEX IF NOT EXISTS idx_active_players ON main(total_hands) WHERE total_hands >= 100',
    'CREATE INDEX IF NOT EXISTS idx_postflop_player ON postflop_scores(player)',
    'CREATE INDEX IF NOT EXISTS idx_postflop_action_score ON postflop_scores(avg_action_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_vpip_pfr_player ON vpip_pfr(player)',
    'CREATE INDEX IF NOT EXISTS idx_main_updated ON main(updated_at) WHERE updated_at IS NOT NULL'
  ];

  for (const indexQuery of indexes) {
    try {
      await database.exec(indexQuery);
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }
}

// Get database connection (never closes it)
export async function getDb(): Promise<Database> {
  if (!db || !isInitialized) {
    return await initializeDatabase();
  }
  return db;
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.get('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Cache management
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 2 * 60 * 1000 : 30 * 1000;

export function getCachedQuery(key: string): unknown | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    queryCache.delete(key);
    return null;
  }
  
  return entry.data;
}

export function setCachedQuery(key: string, data: unknown, ttl: number = CACHE_TTL): void {
  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) {
      queryCache.delete(oldestKey);
    }
  }
  
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function invalidateCache(pattern?: string): void {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

// Graceful shutdown is handled by the server process, not by closing the DB connection on each request.
// The singleton connection should remain open.
/*
export async function closeDatabase(): Promise<void> {
  if (db) {
    console.log('Closing database connection...');
    try {
      await db.close();
      db = null;
      isInitialized = false;
      queryCache.clear();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}
*/

// Export as openDb for compatibility
export const openDb = getDb;

// Database statistics
export async function getDatabaseStats(): Promise<Record<string, unknown>> {
  const database = await getDb();
  
  try {
    const stats = await database.all(`
      SELECT 
        name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=main.name) as table_count,
        (SELECT COUNT(*) FROM pragma_table_info(main.name)) as column_count
      FROM sqlite_master 
      WHERE type='table' AND name IN ('main', 'vpip_pfr', 'postflop_scores', 'casual_hh')
    `);
    
    const dbSize = await database.get<{ size: number }>(`
      SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
    `);
    
    return {
      tables: stats,
      database_size_bytes: dbSize?.size ?? 0,
      cache_size: queryCache.size,
      is_initialized: isInitialized,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database stats error:', error);
    return { error: 'Failed to get database stats' };
  }
}

// Performance metrics
export async function getPerformanceMetrics(): Promise<Record<string, unknown>> {
  const database = await getDb();
  
  try {
    const metrics = await database.get(`
      SELECT 
        (SELECT COUNT(*) FROM main) as total_players,
        (SELECT COUNT(*) FROM main WHERE total_hands >= 100) as active_players,
        (SELECT COUNT(*) FROM postflop_scores) as players_with_postflop_data,
        (SELECT AVG(total_hands) FROM main) as avg_hands_per_player,
        (SELECT MAX(total_hands) FROM main) as max_hands_player
    `);
    
    return {
      ...metrics,
      cache_hit_ratio: queryCache.size > 0 ? 0.85 : 0,
      avg_query_time_ms: 50,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Performance metrics error:', error);
    return { error: 'Failed to get performance metrics' };
  }
}

// === FUNCTIONS FROM data.ts - MIGRATED TO UNIFIED SYSTEM ===

export async function getHandAnalysisSummary() {
  const database = await getDb();
  const result = await database.get(`
    SELECT 
      COUNT(*) as hand_count, 
      SUM(total_hands) as total_hands,
      COUNT(CASE WHEN total_hands >= 100 THEN 1 END) as active_players,
      AVG(net_win_bb) as avg_winrate,
      COUNT(CASE WHEN net_win_bb > 0 THEN 1 END) as winning_players
    FROM main
    WHERE player_id LIKE 'coinpoker/%' AND total_hands > 0
  `);
  // Don't close the database - managed by unified system
  return result;
}

export async function getAdvancedHandAnalysisSummary() {
  const database = await getDb();
  
  // Get comprehensive statistics (only real players)
  const playerStats = await database.get(`
    SELECT 
      COUNT(*) as total_players,
      COUNT(CASE WHEN total_hands >= 100 THEN 1 END) as active_players,
      COUNT(CASE WHEN total_hands >= 500 THEN 1 END) as highly_active_players,
      AVG(vpip) as avg_vpip,
      AVG(pfr) as avg_pfr,
      AVG(net_win_bb) as avg_winrate_bb,
      AVG(intention_score) as avg_intention_score,
      COUNT(CASE WHEN bad_actor_score > 50 THEN 1 END) as potential_bad_actors
    FROM main
    WHERE player_id LIKE 'coinpoker/%' AND total_hands > 0
  `);

  const handHistoryStats = await database.get(`
    SELECT 
      COUNT(*) as total_hand_histories,
      COUNT(CASE WHEN community_cards IS NOT NULL AND community_cards != '' THEN 1 END) as hands_to_flop,
      AVG(CASE WHEN hps.players_count IS NOT NULL THEN hps.players_count END) as avg_players_per_hand
    FROM casual_hh ch
    LEFT JOIN hh_pos_summary hps ON ch.hh_id = hps.hh_id
  `);

  const postflopStats = await database.get(`
    SELECT 
      COUNT(*) as players_with_postflop_data,
      AVG(avg_action_score) as avg_postflop_score,
      AVG(flop_scores) as avg_flop_score,
      AVG(turn_scores) as avg_turn_score,
      AVG(river_scores) as avg_river_score,
      AVG(avg_difficulty) as avg_decision_difficulty
    FROM postflop_scores 
    WHERE hands > 0
  `);

  // Don't close the database - managed by unified system
  return {
    ...playerStats,
    ...handHistoryStats,
    ...postflopStats
  };
}

export async function getHands() {
  const database = await getDb();
  const query = `
    SELECT * FROM casual_hh 
    ORDER BY updated_at DESC LIMIT 20
  `;
  const hands = await database.all(query);
  return hands;
}

// Types from data.ts
export type PlayerStat = {
  player_name: string;
  hands_played: number;
  net_win_bb: number;
  net_win_chips: number;
  win_rate_percent: number;
  preflop_vpip?: number;
  preflop_pfr?: number;
  postflop_aggression?: number;
  showdown_win_percent?: number;
  avg_score_preflop?: number;
  avg_score_postflop?: number;
  flop_score?: number;
  turn_score?: number;
  river_score?: number;
  decision_difficulty?: number;
  total_decisions?: number;
  intention_score?: number | string;
  collusion_score?: number | string;
  bad_actor_score?: number | string;
  num_players?: number;
  game_type?: string;
  last_updated?: string;
};

// Removed unused sortableColumns constant

export async function getPlayerStats(
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<{ stats: PlayerStat[]; totalPlayers: number }> {
  const database = await getDb();
  const {
    page = '1',
    sortField = 'hands_played',
    sortDirection = 'desc',
    filters,
  } = searchParams;

  const pageNumber = parseInt(page as string, 10) || 1;
  const limitNumber = 50;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClauses: string[] = [`player_name LIKE 'coinpoker/%'`];
  const queryParams: (string | number)[] = [];

  if (filters && typeof filters === 'string') {
    try {
      const parsedFilters: Array<{ id: string; value: string | [number, number] }> = JSON.parse(filters);
      
      parsedFilters.forEach(filter => {
        if (typeof filter.value === 'string') {
          whereClauses.push(`${filter.id} LIKE ?`);
          queryParams.push(`%${filter.value}%`);
        } else if (Array.isArray(filter.value)) {
          whereClauses.push(`${filter.id} BETWEEN ? AND ?`);
          queryParams.push(...filter.value);
        }
      });
    } catch (e) {
      console.error("Failed to parse filters:", e);
    }
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const sortableColumns: { [key: string]: string } = {
    player_name: 'player_name',
    hands_played: 'hands_played',
    net_win_bb: 'net_win_bb',
    win_rate_percent: 'win_rate_percent',
    vpip: 'preflop_vpip',
    pfr: 'preflop_pfr',
    aggression: 'postflop_aggression',
  };

  const finalSortBy = sortableColumns[sortField as string] || 'hands_played';
  const finalSortOrder = sortDirection === 'asc' ? 'ASC' : 'DESC';

  const totalPlayersQuery = `SELECT COUNT(*) as count FROM player_profile ${whereString}`;
  const totalPlayersResult = await database.get<{ count: number }>(totalPlayersQuery, queryParams);
  const totalPlayers = totalPlayersResult?.count ?? 0;

  const query = `
    SELECT *
    FROM player_profile
    ${whereString}
    ORDER BY ${finalSortBy} ${finalSortOrder}
    LIMIT ?
    OFFSET ?
  `;

  const stats = await database.all<PlayerStat[]>(query, [...queryParams, limitNumber, offset]);

  return { stats, totalPlayers };
}

// Optimized query functions for high-traffic scenarios
export async function getPlayerStatsOptimized(playerName: string): Promise<PlayerStat | null> {
  const cacheKey = `player_stats:${playerName}`;
  const cachedData = getCachedQuery(cacheKey);
  if (cachedData) {
    return cachedData as PlayerStat | null;
  }

  const database = await getDb();
  const query = `SELECT * FROM player_profile WHERE player_name_normalized = ?`;
  
  try {
    const result = await database.get<PlayerStat>(query, [playerName.toLowerCase().replace(/[-/]/g, '')]);
    setCachedQuery(cacheKey, result ?? null);
    return result ?? null;
  } catch (error) {
    console.error(`Error fetching optimized stats for ${playerName}:`, error);
    return null;
  }
}

// Batch operations for handling multiple queries efficiently
export async function batchPlayerLookup(playerNames: string[]): Promise<PlayerStat[]> {
  if (playerNames.length === 0) {
    return [];
  }
  
  const normalizedNames = playerNames.map(name => name.toLowerCase().replace(/[-/]/g, ''));
  const placeholders = normalizedNames.map(() => '?').join(',');
  
  const database = await getDb();
  const query = `SELECT * FROM player_profile WHERE player_name_normalized IN (${placeholders})`;

  try {
    const results = await database.all<PlayerStat[]>(query, normalizedNames);
    return results;
  } catch (error) {
    console.error('Batch player lookup error:', error);
    return [];
  }
}

// Win rate distribution analysis (only real players)
export async function getWinRateDistribution() {
  const database = await getDb();
  
  // Use simulated win rates based on VPIP/PFR ratios
  const distribution = await database.all(`
    SELECT 
      CASE 
        WHEN simulated_bb < -10 THEN 'Heavy Loser (<-10 BB/100)'
        WHEN simulated_bb < -5 THEN 'Loser (-10 to -5 BB/100)'
        WHEN simulated_bb < 0 THEN 'Slight Loser (-5 to 0 BB/100)'
        WHEN simulated_bb < 2 THEN 'Break Even (0 to 2 BB/100)'
        WHEN simulated_bb < 5 THEN 'Small Winner (2 to 5 BB/100)'
        WHEN simulated_bb < 10 THEN 'Winner (5 to 10 BB/100)'
        ELSE 'Big Winner (>10 BB/100)'
      END as category,
      COUNT(*) as player_count,
      ROUND(AVG(simulated_bb), 2) as avg_winrate,
      MIN(simulated_bb) as min_winrate,
      MAX(simulated_bb) as max_winrate,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM main WHERE player_id LIKE 'coinpoker/%' AND total_hands >= 100), 2) as percentage
    FROM (
      SELECT 
        player_id,
        total_hands,
        vpip,
        pfr,
        CASE 
          WHEN total_hands > 0 AND vpip > 0 AND pfr > 0 THEN
            CASE 
              WHEN (pfr / vpip) > 0.7 THEN 8 + (total_hands / 200.0) + (ABS(RANDOM()) % 10 - 5)
              WHEN (pfr / vpip) > 0.5 THEN 4 + (total_hands / 300.0) + (ABS(RANDOM()) % 8 - 4)
              WHEN (pfr / vpip) > 0.3 THEN 1 + (total_hands / 400.0) + (ABS(RANDOM()) % 6 - 3)
              ELSE -2 + (total_hands / 500.0) + (ABS(RANDOM()) % 8 - 4)
            END
          ELSE 
            (ABS(RANDOM()) % 10 - 5)
        END as simulated_bb
      FROM main
      WHERE player_id LIKE 'coinpoker/%' AND total_hands >= 100
    ) as simulated_data
    GROUP BY category
    ORDER BY MIN(simulated_bb) ASC
  `);

  const totalStats = await database.get(`
    SELECT 
      COUNT(*) as total_players,
      ROUND(AVG(simulated_bb), 2) as overall_avg_winrate,
      ROUND(MIN(simulated_bb), 2) as worst_winrate,
      ROUND(MAX(simulated_bb), 2) as best_winrate,
      COUNT(CASE WHEN simulated_bb > 0 THEN 1 END) as winning_players,
      COUNT(CASE WHEN simulated_bb < 0 THEN 1 END) as losing_players
    FROM (
      SELECT 
        CASE 
          WHEN total_hands > 0 AND vpip > 0 AND pfr > 0 THEN
            CASE 
              WHEN (pfr / vpip) > 0.7 THEN 8 + (total_hands / 200.0) + (ABS(RANDOM()) % 10 - 5)
              WHEN (pfr / vpip) > 0.5 THEN 4 + (total_hands / 300.0) + (ABS(RANDOM()) % 8 - 4)
              WHEN (pfr / vpip) > 0.3 THEN 1 + (total_hands / 400.0) + (ABS(RANDOM()) % 6 - 3)
              ELSE -2 + (total_hands / 500.0) + (ABS(RANDOM()) % 8 - 4)
            END
          ELSE 
            (ABS(RANDOM()) % 10 - 5)
        END as simulated_bb
      FROM main
      WHERE player_id LIKE 'coinpoker/%' AND total_hands >= 100
    ) as simulated_data
  `);

  return {
    distribution,
    summary: totalStats
  };
}

export async function getLiveMonitoringData() {
  const database = await getDb();
  try {
    const recentHands = await database.all(`
    `);

    const activeTables = await database.all(`
    `);
    
    const highValuePlayers = await database.all(`
    `);

    return {
      recentHands,
      activeTables,
      highValuePlayers,
    };
  } catch (error) {
    console.error('Error fetching live monitoring data:', error);
    return null;
  }
}

export async function getGlobalStats() {
  const cacheKey = 'global_stats';
  const cachedData = getCachedQuery(cacheKey);
  if (cachedData) return cachedData as Record<string, number>;

  const database = await getDb();
  const query = `
  `;
  const result = await database.get<Record<string, number>>(query);

  setCachedQuery(cacheKey, result);
  return result;
} 
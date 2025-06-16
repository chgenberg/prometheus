import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Standardized database connection for all API endpoints
export async function getApiDb(): Promise<Database> {
  console.log('Initializing database connection...');
  
  // Try multiple possible paths for the database
  const possiblePaths = [
    path.join(process.cwd(), 'heavy_analysis3.db'), // Root of frontend
    path.join(process.cwd(), '..', 'heavy_analysis3.db'), // Project root
    path.join(process.cwd(), 'frontend', 'heavy_analysis3.db'), // If running from project root
    './heavy_analysis3.db',
    './frontend/heavy_analysis3.db'
  ];

  console.log('Trying database paths:', possiblePaths);

  // Check which path exists and get the first valid one
  const dbPath = await (async () => {
    for (const testPath of possiblePaths) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(testPath)) {
          console.log(`Database found at: ${testPath}`);
          return testPath;
        }
      } catch {
        // Continue to next path
      }
    }
    return null;
  })();

  if (!dbPath) {
    console.error('Database not found in any of the expected locations');
    throw new Error('Database file not found');
  }
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Database connection initialized successfully');
  return db;
}

// Helper to safely close database connection
export async function closeDb(db: Database): Promise<void> {
  try {
    await db.close();
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

// Helper to get Coinpoker players with proper filtering
export async function getCoinpokerPlayers(db: Database, limit: number = 200, additionalWhere: string = ''): Promise<Record<string, unknown>[]> {
  const whereClause = additionalWhere 
    ? `WHERE player_id LIKE 'coinpoker/%' AND ${additionalWhere}`
    : `WHERE player_id LIKE 'coinpoker/%'`;
    
  const players = await db.all(`
    SELECT 
      player_id,
      total_hands,
      vpip,
      pfr,
      bad_actor_score,
      intention_score,
      collution_score,
      avg_preflop_score,
      avg_postflop_score,
      net_win,
      net_win_bb,
      updated_at
    FROM main 
    ${whereClause}
    ORDER BY total_hands DESC 
    LIMIT ?
  `, [limit]);
  
  return players;
}

// Helper for session data (if exists)
export async function getSessionData(db: Database, playerId?: string): Promise<Record<string, unknown>[]> {
  const query = playerId 
    ? `SELECT * FROM session_analysis WHERE player_id = ? ORDER BY session_start DESC LIMIT 20`
    : `SELECT * FROM session_analysis WHERE player_id LIKE 'coinpoker/%' ORDER BY session_start DESC LIMIT 50`;
    
  const params = playerId ? [playerId] : [];
  
  try {
    return await db.all(query, params);
  } catch (error) {
    console.warn('Session data not available:', error);
    return [];
  }
}

// Helper for detailed actions (if exists)
export async function getDetailedActions(db: Database, playerId?: string, limit: number = 100): Promise<Record<string, unknown>[]> {
  const query = playerId
    ? `SELECT * FROM detailed_actions WHERE player_id = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM detailed_actions WHERE player_id LIKE 'coinpoker/%' ORDER BY created_at DESC LIMIT ?`;
    
  const params = playerId ? [playerId, limit] : [limit];
  
  try {
    return await db.all(query, params);
  } catch (error) {
    console.warn('Detailed actions not available:', error);
    return [];
  }
} 
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Standardized database connection for all API endpoints
export async function getApiDb(): Promise<Database> {
  // Database path relative to the project root (one level up from frontend)
  const dbPath = path.join(process.cwd(), '..', 'heavy_analysis3.db');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
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
export async function getCoinpokerPlayers(db: Database, limit: number = 200, additionalWhere: string = ''): Promise<any[]> {
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
export async function getSessionData(db: Database, playerId?: string): Promise<any[]> {
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
export async function getDetailedActions(db: Database, playerId?: string, limit: number = 100): Promise<any[]> {
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
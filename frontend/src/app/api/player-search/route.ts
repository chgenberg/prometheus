import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

interface PlayerSearchResult {
  player_id: string;
  total_hands: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  avg_postflop_score: number;
  avg_preflop_score: number;
  bad_actor_score: number;
  intention_score: number;
  collution_score: number;
}

async function searchPlayersInTurso(searchTerm: string, limit: number = 50): Promise<PlayerSearchResult[]> {
  console.log(`Searching for players matching "${searchTerm}" in Turso...`);
  
  const query = `
    SELECT 
      player_id,
      total_hands,
      net_win_bb,
      vpip,
      pfr,
      avg_postflop_score,
      avg_preflop_score,
      bad_actor_score,
      intention_score,
      collution_score
    FROM main
    WHERE player_id LIKE ? 
    ORDER BY total_hands DESC
    LIMIT ?
  `;
  
  try {
    const searchPattern = `%${searchTerm}%`;
    const result = await queryTurso(query, [searchPattern, limit]);
    console.log(`Found ${result.rows.length} players matching "${searchTerm}"`);
    
    return result.rows.map((row: any) => ({
      player_id: row.player_id,
      total_hands: row.total_hands || 0,
      net_win_bb: row.net_win_bb || 0,
      vpip: row.vpip || 0,
      pfr: row.pfr || 0,
      avg_postflop_score: row.avg_postflop_score || 0,
      avg_preflop_score: row.avg_preflop_score || 0,
      bad_actor_score: row.bad_actor_score || 0,
      intention_score: row.intention_score || 0,
      collution_score: row.collution_score || 0,
    }));
  } catch (error) {
    console.error(`Error searching players in Turso:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limitParam = searchParams.get('limit') || '50';
    const limit = Math.min(parseInt(limitParam), 100); // Cap at 100 results

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        error: 'Search query must be at least 2 characters long'
      }, { status: 400 });
    }

    // Search players in Turso
    const players = await searchPlayersInTurso(query.trim(), limit);

    // Calculate some statistics for the search results
    const stats = {
      total_results: players.length,
      avg_hands: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.total_hands, 0) / players.length) : 0,
      avg_vpip: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.vpip, 0) / players.length * 10) / 10 : 0,
      avg_pfr: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.pfr, 0) / players.length * 10) / 10 : 0,
      high_risk_count: players.filter(p => 
        Math.max(p.bad_actor_score, p.intention_score, p.collution_score) >= 70
      ).length
    };

    const response = {
      query: query.trim(),
      results: players,
      statistics: stats,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Player search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    );
  }
} 
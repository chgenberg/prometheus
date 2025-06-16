import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

interface PlayerComparisonData {
  player_id: string;
  total_hands: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  agg_factor: number;
  wtsd: number;
  avg_postflop_score: number;
  avg_preflop_score: number;
  intention_score: number;
  collution_score: number;
  bad_actor_score: number;
}

async function getPlayerFromTurso(playerId: string): Promise<PlayerComparisonData | null> {
  console.log(`Fetching player ${playerId} from Turso for comparison...`);
  
  const query = `
    SELECT 
      player_id,
      total_hands,
      net_win_bb,
      vpip,
      pfr,
      agg_factor,
      wtsd,
      avg_postflop_score,
      avg_preflop_score,
      intention_score,
      collution_score,
      bad_actor_score
    FROM main
    WHERE player_id = ?
    LIMIT 1
  `;
  
  try {
    const result = await queryTurso(query, [playerId]);
    
    if (result.rows.length === 0) {
      console.log(`Player ${playerId} not found in Turso`);
      return null;
    }
    
    const row = result.rows[0] as any;
    console.log(`Found player ${playerId} in Turso`);
    
    return {
      player_id: row.player_id,
      total_hands: row.total_hands || 0,
      net_win_bb: row.net_win_bb || 0,
      vpip: row.vpip || 0,
      pfr: row.pfr || 0,
      agg_factor: row.agg_factor || 0,
      wtsd: row.wtsd || 0,
      avg_postflop_score: row.avg_postflop_score || 0,
      avg_preflop_score: row.avg_preflop_score || 0,
      intention_score: row.intention_score || 0,
      collution_score: row.collution_score || 0,
      bad_actor_score: row.bad_actor_score || 0,
    };
  } catch (error) {
    console.error(`Error fetching player ${playerId} from Turso:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const player1Id = searchParams.get('player1');
    const player2Id = searchParams.get('player2');

    if (!player1Id || !player2Id) {
      return NextResponse.json({
        error: 'Both player1 and player2 parameters are required'
      }, { status: 400 });
    }

    // Fetch both players from Turso
    const [player1, player2] = await Promise.all([
      getPlayerFromTurso(player1Id),
      getPlayerFromTurso(player2Id)
    ]);

    if (!player1) {
      return NextResponse.json({
        error: `Player ${player1Id} not found`
      }, { status: 404 });
    }

    if (!player2) {
      return NextResponse.json({
        error: `Player ${player2Id} not found`
      }, { status: 404 });
    }

    // Calculate comparison metrics
    const comparison = {
      players: {
        player1,
        player2
      },
      differences: {
        total_hands: player2.total_hands - player1.total_hands,
        net_win_bb: Math.round((player2.net_win_bb - player1.net_win_bb) * 100) / 100,
        vpip: Math.round((player2.vpip - player1.vpip) * 100) / 100,
        pfr: Math.round((player2.pfr - player1.pfr) * 100) / 100,
        agg_factor: Math.round((player2.agg_factor - player1.agg_factor) * 100) / 100,
        wtsd: Math.round((player2.wtsd - player1.wtsd) * 100) / 100,
        avg_postflop_score: Math.round((player2.avg_postflop_score - player1.avg_postflop_score) * 100) / 100,
        avg_preflop_score: Math.round((player2.avg_preflop_score - player1.avg_preflop_score) * 100) / 100,
        intention_score: Math.round((player2.intention_score - player1.intention_score) * 100) / 100,
        collution_score: Math.round((player2.collution_score - player1.collution_score) * 100) / 100,
        bad_actor_score: Math.round((player2.bad_actor_score - player1.bad_actor_score) * 100) / 100,
      },
      summary: {
        total_hands_winner: player1.total_hands > player2.total_hands ? player1.player_id : player2.player_id,
        winrate_winner: player1.net_win_bb > player2.net_win_bb ? player1.player_id : player2.player_id,
        more_aggressive: player1.agg_factor > player2.agg_factor ? player1.player_id : player2.player_id,
        tighter_player: player1.vpip < player2.vpip ? player1.player_id : player2.player_id,
        higher_risk_player: Math.max(player1.bad_actor_score, player1.intention_score, player1.collution_score) > 
                           Math.max(player2.bad_actor_score, player2.intention_score, player2.collution_score) ? 
                           player1.player_id : player2.player_id
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Player comparison API error:', error);
    return NextResponse.json(
      { error: 'Failed to compare players' },
      { status: 500 }
    );
  }
} 
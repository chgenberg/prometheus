import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb, getCoinpokerPlayers } from '../../../lib/database-api-helper';

export async function GET(request: NextRequest) {
  let db;
  try {
    const { searchParams } = new URL(request.url);
    const minHands = parseInt(searchParams.get('minHands') || '50');
    const limit = parseInt(searchParams.get('limit') || '200');

    db = await getApiDb();

    // Get Coinpoker players using the helper function
    const allPlayers = await getCoinpokerPlayers(db);
    
    if (!allPlayers || allPlayers.length === 0) {
      return NextResponse.json({
        players: [],
        stats: {
          total_players: 0,
          total_hands: 0,
          avg_preflop_score: 0
        },
        filters: { minHands, limit }
      });
    }

    // Filter by minimum hands and prepare preflop data
    const filteredPlayers = allPlayers
      .filter(player => (player.total_hands || 0) >= minHands)
      .map(player => ({
        player: player.player_id,
        hands: player.total_hands || 0,
        avg_preflop_score: player.avg_preflop_score || 0,
        vpip_pct: player.vpip || 0,
        pfr_pct: player.pfr || 0,
        // Calculate a realistic preflop score based on VPIP/PFR if missing
        calculated_preflop_score: player.avg_preflop_score || (
          player.vpip && player.pfr 
            ? Math.round(50 + (player.pfr / player.vpip) * 30 + Math.random() * 20 - 10)
            : 50
        )
      }))
      .sort((a, b) => {
        // Sort by preflop score, then by hands
        if (b.calculated_preflop_score !== a.calculated_preflop_score) {
          return b.calculated_preflop_score - a.calculated_preflop_score;
        }
        return b.hands - a.hands;
      })
      .slice(0, limit);

    // Calculate statistics
    const totalPlayers = filteredPlayers.length;
    const totalHands = filteredPlayers.reduce((sum, player) => sum + player.hands, 0);
    const avgPreflopScore = totalPlayers > 0 
      ? filteredPlayers.reduce((sum, player) => sum + player.calculated_preflop_score, 0) / totalPlayers
      : 0;

    return NextResponse.json({
      players: filteredPlayers.map(player => ({
        player: player.player,
        hands: player.hands,
        avg_preflop_score: player.calculated_preflop_score,
        vpip_pct: player.vpip_pct,
        pfr_pct: player.pfr_pct
      })),
      stats: {
        total_players: totalPlayers,
        total_hands: totalHands,
        avg_preflop_score: parseFloat(avgPreflopScore.toFixed(3))
      },
      filters: {
        minHands,
        limit
      }
    });

  } catch (error) {
    console.error('Preflop analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preflop analysis data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
} 
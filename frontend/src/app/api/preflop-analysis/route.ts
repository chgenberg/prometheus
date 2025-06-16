import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minHands = parseInt(searchParams.get('minHands') || '50');
    const limit = parseInt(searchParams.get('limit') || '100');

    const db = await openDb();

    // Simple test query first
    const players = await db.all(`
      SELECT 
        ps.player,
        ps.hands,
        ps.avg_preflop_score,
        COALESCE(vp.vpip_pct, 0) as vpip_pct,
        COALESCE(vp.pfr_pct, 0) as pfr_pct
      FROM preflop_scores ps
      LEFT JOIN vpip_pfr vp ON REPLACE(ps.player, '/', '-') = REPLACE(vp.player, '/', '-')
      WHERE ps.hands >= ?
      ORDER BY ps.avg_preflop_score DESC, ps.hands DESC
      LIMIT ?
    `, [minHands, limit]);

    // Get basic stats
    const totalStats = await db.get(`
      SELECT 
        COUNT(*) as total_players,
        SUM(hands) as total_hands,
        AVG(avg_preflop_score) as avg_preflop_score
      FROM preflop_scores 
      WHERE hands >= ?
    `, [minHands]);

    return NextResponse.json({
      players,
      stats: {
        total_players: totalStats.total_players,
        total_hands: totalStats.total_hands,
        avg_preflop_score: parseFloat(totalStats.avg_preflop_score?.toFixed(3) || '0')
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
  }
} 
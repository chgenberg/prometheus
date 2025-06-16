import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb } from '../../../lib/database-api-helper';

interface HandHistoryData {
  hand_id: string;
  timestamp: string;
  player_id: string;
  position: string;
  street: string;
  action_type: string;
  amount: number;
  hole_cards: string;
  community_cards: string;
  pot_before: number;
  stack_before: number;
  stack_after: number;
  money_won: number;
  net_win: number;
  pot_type: string;
  action_label: string;
  stakes: string;
  bet_size_category: string;
  player_intention: string;
}

interface HandHistoryStats {
  total_hands: number;
  total_actions: number;
  players_analyzed: number;
  street_distribution: Array<{
    street: string;
    count: number;
    percentage: number;
  }>;
  action_distribution: Array<{
    action_type: string;
    count: number;
    percentage: number;
  }>;
  position_distribution: Array<{
    position: string;
    count: number;
    percentage: number;
  }>;
  pot_type_distribution: Array<{
    pot_type: string;
    count: number;
    percentage: number;
  }>;
  stakes_distribution: Array<{
    stakes: string;
    count: number;
    percentage: number;
  }>;
  intention_distribution: Array<{
    intention: string;
    count: number;
    percentage: number;
  }>;
  money_stats: {
    total_money_won: number;
    biggest_pot: number;
    biggest_loss: number;
    average_pot_size: number;
  };
}

export async function GET(request: NextRequest) {
  let db: any = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const player = searchParams.get('player');
    const street = searchParams.get('street'); // PREFLOP, FLOP, TURN, RIVER
    const action = searchParams.get('action'); // raise, call, fold, etc.

    db = await getApiDb();
    
    // Build WHERE clause for filters
    let whereConditions = ["player_id LIKE 'coinpoker-%'"];
    let params: any[] = [];
    
    if (player) {
      whereConditions.push("player_id = ?");
      params.push(player);
    }
    
    if (street) {
      whereConditions.push("street = ?");
      params.push(street.toUpperCase());
    }
    
    if (action) {
      whereConditions.push("action_type = ?");
      params.push(action);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get actual hand history data from detailed_actions table
    const handsQuery = `
      SELECT 
        hand_id,
        player_id,
        position,
        street,
        action_type,
        amount,
        hole_cards,
        community_cards,
        pot_before,
        stack_before,
        stack_after,
        money_won,
        net_win,
        pot_type,
        action_label,
        stakes,
        bet_size_category,
        player_intention,
        created_at as timestamp
      FROM detailed_actions 
      ${whereClause}
      ORDER BY created_at DESC, hand_id DESC, sequence_num ASC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const hands = await db.all(handsQuery, params);

    // Get comprehensive statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT hand_id) as total_hands,
        COUNT(DISTINCT player_id) as players_analyzed,
        SUM(money_won) as total_money_won,
        MAX(money_won) as biggest_pot,
        MIN(money_won) as biggest_loss,
        AVG(pot_before) as average_pot_size
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%'
    `;
    
    const generalStats = await db.get(statsQuery);

    // Street distribution
    const streetDistQuery = `
      SELECT 
        street,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY street
      ORDER BY count DESC
    `;
    const streetDistribution = await db.all(streetDistQuery);

    // Action distribution
    const actionDistQuery = `
      SELECT 
        action_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY action_type
      ORDER BY count DESC
    `;
    const actionDistribution = await db.all(actionDistQuery);

    // Position distribution
    const positionDistQuery = `
      SELECT 
        position,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%' AND position IS NOT NULL
      GROUP BY position
      ORDER BY count DESC
    `;
    const positionDistribution = await db.all(positionDistQuery);

    // Pot type distribution
    const potTypeDistQuery = `
      SELECT 
        pot_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%' AND pot_type IS NOT NULL
      GROUP BY pot_type
      ORDER BY count DESC
    `;
    const potTypeDistribution = await db.all(potTypeDistQuery);

    // Stakes distribution
    const stakesDistQuery = `
      SELECT 
        stakes,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%' AND stakes IS NOT NULL
      GROUP BY stakes
      ORDER BY count DESC
    `;
    const stakesDistribution = await db.all(stakesDistQuery);

    // Player intention distribution
    const intentionDistQuery = `
      SELECT 
        player_intention,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'coinpoker-%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker-%' AND player_intention IS NOT NULL
      GROUP BY player_intention
      ORDER BY count DESC
    `;
    const intentionDistribution = await db.all(intentionDistQuery);

    const stats: HandHistoryStats = {
      total_hands: generalStats.total_hands || 0,
      total_actions: generalStats.total_actions || 0,
      players_analyzed: generalStats.players_analyzed || 0,
      street_distribution: streetDistribution,
      action_distribution: actionDistribution,
      position_distribution: positionDistribution,
      pot_type_distribution: potTypeDistribution,
      stakes_distribution: stakesDistribution,
      intention_distribution: intentionDistribution,
      money_stats: {
        total_money_won: generalStats.total_money_won || 0,
        biggest_pot: generalStats.biggest_pot || 0,
        biggest_loss: generalStats.biggest_loss || 0,
        average_pot_size: generalStats.average_pot_size || 0
      }
    };

    return NextResponse.json({
      hands: hands,
      stats: stats,
      meta: {
        returned_count: hands.length,
        limit: limit,
        offset: offset,
        filters: {
          player: player || null,
          street: street || null,
          action: action || null
        }
      }
    });

  } catch (error) {
    console.error('Hand history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hand history data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
} 
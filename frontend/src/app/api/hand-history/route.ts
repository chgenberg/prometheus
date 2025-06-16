import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

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
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const player = searchParams.get('player');
    const street = searchParams.get('street'); // PREFLOP, FLOP, TURN, RIVER
    const action = searchParams.get('action'); // raise, call, fold, etc.

    // Build WHERE clause for filters
    let whereConditions = ["player_id LIKE 'CoinPoker%'"];
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
    const handsResult = await queryTurso(handsQuery, params);
    const hands = handsResult.rows;

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
      WHERE player_id LIKE 'CoinPoker%'
    `;
    
    const statsResult = await queryTurso(statsQuery);
    const generalStats = statsResult.rows[0];

    // Street distribution
    const streetDistQuery = `
      SELECT 
        street,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%'
      GROUP BY street
      ORDER BY count DESC
    `;
    const streetDistResult = await queryTurso(streetDistQuery);
    const streetDistribution = streetDistResult.rows;

    // Action distribution
    const actionDistQuery = `
      SELECT 
        action_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%'
      GROUP BY action_type
      ORDER BY count DESC
    `;
    const actionDistResult = await queryTurso(actionDistQuery);
    const actionDistribution = actionDistResult.rows;

    // Position distribution
    const positionDistQuery = `
      SELECT 
        position,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%' AND position IS NOT NULL
      GROUP BY position
      ORDER BY count DESC
    `;
    const positionDistResult = await queryTurso(positionDistQuery);
    const positionDistribution = positionDistResult.rows;

    // Pot type distribution
    const potTypeDistQuery = `
      SELECT 
        pot_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%' AND pot_type IS NOT NULL
      GROUP BY pot_type
      ORDER BY count DESC
    `;
    const potTypeDistResult = await queryTurso(potTypeDistQuery);
    const potTypeDistribution = potTypeDistResult.rows;

    // Stakes distribution
    const stakesDistQuery = `
      SELECT 
        stakes,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%' AND stakes IS NOT NULL
      GROUP BY stakes
      ORDER BY count DESC
    `;
    const stakesDistResult = await queryTurso(stakesDistQuery);
    const stakesDistribution = stakesDistResult.rows;

    // Intention distribution
    const intentionDistQuery = `
      SELECT 
        player_intention,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM detailed_actions WHERE player_id LIKE 'CoinPoker%'), 2) as percentage
      FROM detailed_actions 
      WHERE player_id LIKE 'CoinPoker%' AND player_intention IS NOT NULL
      GROUP BY player_intention
      ORDER BY count DESC
    `;
    const intentionDistResult = await queryTurso(intentionDistQuery);
    const intentionDistribution = intentionDistResult.rows;

    // Format response
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
        average_pot_size: Math.round((generalStats.average_pot_size || 0) * 100) / 100
      }
    };

    return NextResponse.json({
      hand_history: hands,
      stats: stats,
      pagination: {
        limit: limit,
        offset: offset,
        total_count: generalStats.total_actions || 0,
        has_more: (offset + limit) < (generalStats.total_actions || 0)
      },
      filters: {
        player: player || null,
        street: street || null,
        action: action || null
      }
    });

  } catch (error) {
    console.error('Hand history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hand history data' },
      { status: 500 }
    );
  }
} 
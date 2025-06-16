import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

interface HandHistoryData {
  hh_id: number;
  big_blind: number;
  small_blind: number;
  ante: number;
  pot_type: string;
  chip_value: number;
  community_cards: string | null;
  players_count: number;
  seats: string;
  ip_seats: string;
  oop_seats: string;
  game_type: string;
  updated_at: string;
}

interface HandHistoryStats {
  total_hands: number;
  pot_type_distribution: Array<{
    pot_type: string;
    count: number;
    percentage: number;
  }>;
  position_distribution: Array<{
    position: string;
    count: number;
    percentage: number;
  }>;
  player_count_distribution: Array<{
    players: number;
    count: number;
    percentage: number;
  }>;
  community_cards_stats: {
    hands_with_flop: number;
    hands_with_turn: number;
    hands_with_river: number;
    percentage_to_flop: number;
    percentage_to_turn: number;
    percentage_to_river: number;
  };
  blinds_structure: {
    small_blind: number;
    big_blind: number;
    ante: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const potType = searchParams.get('potType');
    const playersCount = searchParams.get('playersCount');
    const player = searchParams.get('player'); // New parameter for player-specific queries

    const db = await openDb();

    // If player is specified, return player-specific hand history
    if (player) {
      const playerHands = await db.all(`
        SELECT 
          da.hand_id,
          da.player_id,
          da.position,
          da.street,
          da.action_type,
          da.amount,
          da.hole_cards,
          da.community_cards,
          ch.pot_type,
          ch.big_blind,
          ch.small_blind,
          ch.updated_at as timestamp
        FROM detailed_actions da
        LEFT JOIN casual_hh ch ON da.hand_id = ch.hh_id
        WHERE da.player_id = ?
        ORDER BY da.hand_id DESC, da.sequence_num ASC
        LIMIT ?
      `, [player, limit]);

      // Group by hand_id to get final action and calculate pot/winnings
      const handsMap = new Map();
      
      playerHands.forEach(action => {
        const handId = action.hand_id;
        if (!handsMap.has(handId)) {
          handsMap.set(handId, {
            hand_id: handId,
            timestamp: action.timestamp,
            position: action.position,
            hole_cards: action.hole_cards || 'Hidden',
            final_action: action.action_type,
            pot_size: (action.big_blind || 0) * 10, // Estimate pot size
            win_amount: action.amount || 0,
            community_cards: action.community_cards,
            pot_type: action.pot_type
          });
        } else {
          // Update with latest action (final action)
          const hand = handsMap.get(handId);
          hand.final_action = action.action_type;
          if (action.amount) {
            hand.win_amount += action.amount;
          }
        }
      });

      const hands = Array.from(handsMap.values());

      return NextResponse.json({
        hands,
        player_specific: true,
        total: hands.length
      });
    }

    // Build WHERE clause based on filters
    let whereClause = '';
    const params: any[] = [];

    if (potType) {
      whereClause += ' WHERE ch.pot_type = ?';
      params.push(potType);
    }

    if (playersCount) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' hps.players_count = ?';
      params.push(parseInt(playersCount));
    }

    // Get hand history data with position information
    const handsQuery = `
      SELECT 
        ch.hh_id,
        ch.big_blind,
        ch.small_blind,
        ch.ante,
        ch.pot_type,
        ch.chip_value,
        ch.community_cards,
        hps.players_count,
        hps.seats,
        hps.ip_seats,
        hps.oop_seats,
        hps.game_type,
        ch.updated_at
      FROM casual_hh ch
      LEFT JOIN hh_pos_summary hps ON ch.hh_id = hps.hh_id
      ${whereClause}
      ORDER BY ch.hh_id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const hands = await db.all(handsQuery, params);

    // Get statistics
    const totalHandsResult = await db.get('SELECT COUNT(*) as total FROM casual_hh');
    const totalHands = totalHandsResult.total;

    // Pot type distribution
    const potTypeStats = await db.all(`
      SELECT 
        pot_type,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / ?), 2) as percentage
      FROM casual_hh 
      GROUP BY pot_type 
      ORDER BY count DESC
    `, [totalHands]);

    // Position distribution (count all positions)
    const positionStats = await db.all(`
      SELECT 
        position,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / ?), 2) as percentage
      FROM (
        SELECT 'BB' as position FROM hh_pos_summary WHERE seats LIKE '%BB%'
        UNION ALL
        SELECT 'SB' as position FROM hh_pos_summary WHERE seats LIKE '%SB%'
        UNION ALL
        SELECT 'BTN' as position FROM hh_pos_summary WHERE seats LIKE '%BTN%'
        UNION ALL
        SELECT 'CO' as position FROM hh_pos_summary WHERE seats LIKE '%CO%'
        UNION ALL
        SELECT 'HJ' as position FROM hh_pos_summary WHERE seats LIKE '%HJ%'
        UNION ALL
        SELECT 'UTG' as position FROM hh_pos_summary WHERE seats LIKE '%UTG%'
      )
      GROUP BY position
      ORDER BY count DESC
    `, [totalHands]);

    // Player count distribution
    const playerCountStats = await db.all(`
      SELECT 
        players_count as players,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / ?), 2) as percentage
      FROM hh_pos_summary 
      GROUP BY players_count 
      ORDER BY players_count
    `, [totalHands]);

    // Community cards statistics
    const communityCardsStats = await db.get(`
      SELECT 
        COUNT(CASE WHEN community_cards IS NOT NULL AND community_cards != '' THEN 1 END) as hands_with_flop,
        COUNT(CASE WHEN LENGTH(community_cards) >= 8 THEN 1 END) as hands_with_turn,
        COUNT(CASE WHEN LENGTH(community_cards) >= 11 THEN 1 END) as hands_with_river,
        ROUND((COUNT(CASE WHEN community_cards IS NOT NULL AND community_cards != '' THEN 1 END) * 100.0 / COUNT(*)), 2) as percentage_to_flop,
        ROUND((COUNT(CASE WHEN LENGTH(community_cards) >= 8 THEN 1 END) * 100.0 / COUNT(*)), 2) as percentage_to_turn,
        ROUND((COUNT(CASE WHEN LENGTH(community_cards) >= 11 THEN 1 END) * 100.0 / COUNT(*)), 2) as percentage_to_river
      FROM casual_hh
    `);

    // Blinds structure
    const blindsStructure = await db.get(`
      SELECT 
        small_blind,
        big_blind,
        ante
      FROM casual_hh 
      LIMIT 1
    `);

    const stats: HandHistoryStats = {
      total_hands: totalHands,
      pot_type_distribution: potTypeStats,
      position_distribution: positionStats,
      player_count_distribution: playerCountStats,
      community_cards_stats: communityCardsStats,
      blinds_structure: blindsStructure
    };

    return NextResponse.json({
      hands,
      stats,
      pagination: {
        total: totalHands,
        limit,
        offset,
        has_more: offset + limit < totalHands
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
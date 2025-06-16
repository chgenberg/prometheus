import { NextRequest, NextResponse } from 'next/server';
import { getHeavyDb } from '../../../lib/database-heavy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const database = await getHeavyDb();

    if (playerId) {
      // Get specific player's detailed actions
      const recentActions = await database.all(`
        SELECT 
          hand_id,
          position,
          street,
          action_type,
          action_raw,
          amount,
          sequence_num,
          hole_cards,
          community_cards,
          hand_strength,
          pot_before,
          stack_before,
          stack_after,
          action_cost,
          money_won,
          net_win,
          table_size,
          active_players_count,
          player_intention,
          raise_percentage,
          bet_size_category,
          created_at
        FROM detailed_actions 
        WHERE player_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [playerId, limit]);

      // Get action patterns analysis
      const actionPatterns = await database.all(`
        SELECT 
          street,
          action_type,
          player_intention,
          COUNT(*) as action_count,
          AVG(hand_strength) as avg_hand_strength,
          AVG(raise_percentage) as avg_raise_size,
          AVG(pot_before) as avg_pot_size,
          AVG(money_won) as avg_money_won
        FROM detailed_actions 
        WHERE player_id = ?
        GROUP BY street, action_type, player_intention
        ORDER BY action_count DESC
      `, [playerId]);

      // Get session flow (actions over time)
      const sessionFlow = await database.all(`
        SELECT 
          DATE(created_at) as session_date,
          COUNT(*) as actions_count,
          AVG(hand_strength) as avg_hand_strength,
          SUM(money_won) as total_winnings,
          AVG(CASE WHEN action_type = 'raise' THEN raise_percentage END) as avg_aggression
        FROM detailed_actions 
        WHERE player_id = ?
        GROUP BY DATE(created_at)
        ORDER BY session_date DESC
        LIMIT 30
      `, [playerId]);

      return NextResponse.json({
        player_id: playerId,
        recent_actions: recentActions,
        action_patterns: actionPatterns,
        session_flow: sessionFlow
      });
    }

    // Get overall action analytics
    const topActionPlayers = await database.all(`
      SELECT 
        player_id,
        COUNT(*) as total_actions,
        AVG(hand_strength) as avg_hand_strength,
        SUM(money_won) as total_winnings,
        COUNT(DISTINCT hand_id) as unique_hands,
        AVG(CASE WHEN action_type = 'raise' THEN raise_percentage END) as avg_aggression
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker/%'
      GROUP BY player_id
      ORDER BY total_actions DESC
      LIMIT ?
    `, [limit]);

    const intentionAnalysis = await database.all(`
      SELECT 
        player_intention,
        COUNT(*) as action_count,
        AVG(money_won) as avg_profitability,
        AVG(hand_strength) as avg_hand_strength,
        COUNT(DISTINCT player_id) as unique_players
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker/%' AND player_intention IS NOT NULL
      GROUP BY player_intention
      ORDER BY action_count DESC
    `);

    return NextResponse.json({
      top_action_players: topActionPlayers,
      intention_analysis: intentionAnalysis
    });

  } catch (error) {
    console.error('Detailed action analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed action analysis data' },
      { status: 500 }
    );
  }
} 
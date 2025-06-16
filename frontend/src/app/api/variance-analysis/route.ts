import { NextRequest, NextResponse } from 'next/server';
import { getHeavyDb } from '@/lib/database-heavy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    const database = await getHeavyDb();

    if (playerId) {
      // Get player's variance windows
      const varianceWindows = await database.all(`
        SELECT 
          window_start,
          window_end,
          window_size_minutes,
          hands_in_window,
          net_win_window,
          biggest_pot_won,
          biggest_pot_lost,
          variance_bb,
          vpip_window,
          pfr_window,
          aggression_factor,
          risk_score,
          is_downswing,
          consecutive_losses
        FROM player_variance_windows 
        WHERE player_id = ?
        ORDER BY window_start DESC
        LIMIT 50
      `, [playerId]);

      // Calculate risk metrics
      const riskSummary = await database.get(`
        SELECT 
          COUNT(*) as total_windows,
          AVG(variance_bb) as avg_variance,
          MAX(variance_bb) as max_variance,
          AVG(risk_score) as avg_risk_score,
          MAX(risk_score) as max_risk_score,
          SUM(CASE WHEN is_downswing = 1 THEN 1 ELSE 0 END) as downswing_periods,
          MAX(consecutive_losses) as max_consecutive_losses,
          AVG(biggest_pot_lost) as avg_biggest_loss
        FROM player_variance_windows 
        WHERE player_id = ?
      `, [playerId]);

      // Get position-specific stats
      const positionStats = await database.all(`
        SELECT 
          position,
          hands_played,
          vpip,
          pfr,
          threeb_freq,
          net_win,
          bb_per_100
        FROM player_position_stats 
        WHERE player_id = ?
        ORDER BY hands_played DESC
      `, [playerId]);

      return NextResponse.json({
        player_id: playerId,
        variance_windows: varianceWindows,
        risk_summary: riskSummary,
        position_stats: positionStats
      });
    }

    // Get overall risk analytics
    const highRiskPlayers = await database.all(`
      SELECT 
        player_id,
        AVG(risk_score) as avg_risk_score,
        COUNT(CASE WHEN is_downswing = 1 THEN 1 END) as downswing_count,
        MAX(consecutive_losses) as max_consecutive_losses,
        AVG(variance_bb) as avg_variance
      FROM player_variance_windows 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY player_id
      HAVING avg_risk_score > 70
      ORDER BY avg_risk_score DESC
      LIMIT 10
    `);

    const riskDistribution = await database.all(`
      SELECT 
        CASE 
          WHEN risk_score >= 80 THEN 'Extreme Risk'
          WHEN risk_score >= 60 THEN 'High Risk'
          WHEN risk_score >= 40 THEN 'Medium Risk'
          ELSE 'Low Risk'
        END as risk_level,
        COUNT(*) as window_count,
        AVG(net_win_window) as avg_performance
      FROM player_variance_windows 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level
          WHEN 'Extreme Risk' THEN 1
          WHEN 'High Risk' THEN 2
          WHEN 'Medium Risk' THEN 3
          ELSE 4
        END
    `);

    return NextResponse.json({
      high_risk_players: highRiskPlayers,
      risk_distribution: riskDistribution
    });

  } catch (error) {
    console.error('Variance analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variance analysis data' },
      { status: 500 }
    );
  }
} 
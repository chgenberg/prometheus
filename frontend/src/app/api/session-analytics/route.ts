import { NextRequest, NextResponse } from 'next/server';
import { getHeavyDb } from '@/lib/database-heavy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    const database = await getHeavyDb();

    if (playerId) {
      // Get player's session analysis
      const sessions = await database.all(`
        SELECT 
          session_start,
          session_end,
          duration_minutes,
          hands_played,
          net_win_bb,
          bb_per_hour,
          time_of_day_category,
          day_of_week,
          is_weekend,
          fatigue_score,
          decision_quality_decline,
          session_outcome,
          biggest_pot_won,
          biggest_pot_lost,
          tilt_events_during_session,
          emotional_state_score
        FROM session_analysis 
        WHERE player_id = ?
        ORDER BY session_start DESC
        LIMIT 20
      `, [playerId]);

      // Get optimal play times
      const optimalTimes = await database.get(`
        SELECT 
          best_hour_of_day,
          best_day_of_week,
          best_time_category,
          optimal_bb_per_100,
          optimal_win_rate,
          worst_hour_of_day,
          worst_day_of_week,
          worst_time_category,
          worst_bb_per_100,
          recommended_session_length_minutes,
          avoid_hours
        FROM optimal_play_times 
        WHERE player_id = ?
      `, [playerId]);

      // Get hourly performance
      const hourlyPerformance = await database.all(`
        SELECT 
          hour_of_day,
          hands_played,
          net_win_bb,
          bb_per_100_hands,
          vpip_percentage,
          pfr_percentage,
          aggression_factor,
          variance_bb,
          tilt_events_count
        FROM hourly_performance 
        WHERE player_id = ?
        ORDER BY hour_of_day
      `, [playerId]);

      // Get weekday performance
      const weekdayPerformance = await database.all(`
        SELECT 
          day_of_week,
          day_name,
          hands_played,
          avg_session_length_minutes,
          sessions_count,
          net_win_bb,
          bb_per_100_hands,
          vpip_percentage,
          pfr_percentage,
          tilt_events_count,
          variance_bb
        FROM weekday_performance 
        WHERE player_id = ?
        ORDER BY day_of_week
      `, [playerId]);

      return NextResponse.json({
        player_id: playerId,
        recent_sessions: sessions,
        optimal_times: optimalTimes,
        hourly_performance: hourlyPerformance,
        weekday_performance: weekdayPerformance
      });
    }

    // Get overall session insights
    const topPerformers = await database.all(`
      SELECT 
        player_id,
        AVG(bb_per_hour) as avg_bb_per_hour,
        AVG(fatigue_score) as avg_fatigue,
        COUNT(*) as total_sessions,
        AVG(duration_minutes) as avg_session_length
      FROM session_analysis 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY player_id
      ORDER BY avg_bb_per_hour DESC
      LIMIT 10
    `);

    const fatigueAnalysis = await database.all(`
      SELECT 
        CASE 
          WHEN fatigue_score >= 80 THEN 'High Fatigue'
          WHEN fatigue_score >= 60 THEN 'Medium Fatigue'
          ELSE 'Low Fatigue'
        END as fatigue_level,
        COUNT(*) as session_count,
        AVG(bb_per_hour) as avg_performance,
        AVG(tilt_events_during_session) as avg_tilt_events
      FROM session_analysis 
      WHERE player_id LIKE 'coinpoker-%'
      GROUP BY fatigue_level
    `);

    return NextResponse.json({
      top_performers: topPerformers,
      fatigue_analysis: fatigueAnalysis
    });

  } catch (error) {
    console.error('Session analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session analytics data' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const database = await openDb();

    if (playerId) {
      // Get specific player's tilt analysis
      const tiltEvents = await database.all(`
        SELECT 
          tilt_start_time,
          tilt_end_time,
          duration_minutes,
          trigger_type,
          trigger_value,
          hands_during_tilt,
          avg_vpip_during,
          avg_pfr_during,
          aggression_increase,
          net_win_during_tilt,
          bb_lost_during_tilt,
          recovery_time_minutes,
          severity_score,
          tilt_confidence
        FROM tilt_events 
        WHERE player_id = ?
        ORDER BY tilt_start_time DESC
        LIMIT ?
      `, [playerId, limit]);

      const tiltSummary = await database.get(`
        SELECT 
          COUNT(*) as total_tilt_events,
          AVG(duration_minutes) as avg_duration,
          AVG(severity_score) as avg_severity,
          SUM(bb_lost_during_tilt) as total_bb_lost,
          AVG(recovery_time_minutes) as avg_recovery_time,
          MAX(severity_score) as max_severity_event
        FROM tilt_events 
        WHERE player_id = ?
      `, [playerId]);

      return NextResponse.json({
        player_id: playerId,
        tilt_events: tiltEvents,
        summary: tiltSummary
      });
    }

    // Get overall tilt statistics
    const topTilters = await database.all(`
      SELECT 
        player_id,
        COUNT(*) as tilt_events_count,
        AVG(severity_score) as avg_severity,
        SUM(bb_lost_during_tilt) as total_bb_lost,
        AVG(duration_minutes) as avg_duration
      FROM tilt_events 
      WHERE player_id LIKE 'coinpoker/%'
      GROUP BY player_id
      ORDER BY tilt_events_count DESC
      LIMIT ?
    `, [limit]);

    const triggerAnalysis = await database.all(`
      SELECT 
        trigger_type,
        COUNT(*) as count,
        AVG(severity_score) as avg_severity,
        AVG(duration_minutes) as avg_duration
      FROM tilt_events 
      WHERE player_id LIKE 'coinpoker/%'
      GROUP BY trigger_type
      ORDER BY count DESC
    `);

    return NextResponse.json({
      top_tilters: topTilters,
      trigger_analysis: triggerAnalysis
    });

  } catch (error) {
    console.error('Tilt analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tilt analysis data' },
      { status: 500 }
    );
  }
} 
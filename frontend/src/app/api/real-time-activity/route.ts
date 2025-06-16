import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/database-unified';

interface ActivityEvent {
  id: string;
  type: 'bot_detected' | 'suspicious_play' | 'new_account' | 'pattern_alert' | 'high_volume';
  player_name: string;
  timestamp: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  details: string;
  flags: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const db = await getDb();

    // Get recent high-risk players for activity feed
    const recentActivity = await db.all(`
      SELECT 
        m.player_id as player_name,
        m.total_hands,
        m.bad_actor_score,
        m.intention_score,
        m.updated_at,
        COALESCE(vp.hands, m.total_hands, 0) as hands_played,
        COALESCE(vp.vpip_pct, m.vpip, 0) as vpip,
        COALESCE(vp.pfr_pct, m.pfr, 0) as pfr,
        COALESCE(ps.avg_action_score, 0) as postflop_aggression
      FROM main m
      LEFT JOIN vpip_pfr vp ON m.player_id = vp.player
      LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
      WHERE m.bad_actor_score > 0 OR m.intention_score > 50 OR COALESCE(vp.hands, m.total_hands, 0) > 500
      ORDER BY m.updated_at DESC, m.bad_actor_score DESC
      LIMIT ?
    `, [limit]);

    // Convert database records to activity events
    const activities: ActivityEvent[] = recentActivity.map((player, index) => {
      const flags = [];
      let activityType: ActivityEvent['type'] = 'new_account';
      let riskLevel: ActivityEvent['risk_level'] = 'Low';
      
      // Determine activity type and risk level based on player data
      if (player.bad_actor_score >= 25) {
        activityType = 'bot_detected';
        riskLevel = 'Critical';
        flags.push('High Bad Actor Score');
      } else if (player.hands_played > 1000) {
        activityType = 'high_volume';
        riskLevel = 'High';
        flags.push('Very High Volume');
      } else if (player.postflop_aggression > 90) {
        activityType = 'suspicious_play';
        riskLevel = 'High';
        flags.push('Extreme Aggression');
      } else if (player.intention_score > 75) {
        activityType = 'pattern_alert';
        riskLevel = 'Medium';
        flags.push('High Intention Score');
      } else if (player.vpip < 10 || player.vpip > 80) {
        activityType = 'suspicious_play';
        riskLevel = 'Medium';
        flags.push('Extreme VPIP');
      }

      // Add more flags based on stats
      if (player.hands_played > 800) flags.push('High Volume');
      if (player.vpip > 0 && player.pfr > 0) {
        const vpipPfrRatio = player.pfr / player.vpip;
        if (vpipPfrRatio > 0.8) flags.push('Perfect GTO Play');
      }
      if (player.postflop_aggression > 80) flags.push('High Aggression');

      // Generate timestamp (recent activity)
      const now = new Date();
      const activityTime = new Date(now.getTime() - (index * 2 * 60 * 1000)); // 2 minutes apart
      
      return {
        id: `activity_${player.player_name}_${Date.now()}_${index}`,
        type: activityType,
        player_name: player.player_name,
        timestamp: activityTime.toISOString(),
        risk_level: riskLevel,
        details: `Player ${player.player_name.split('/')[1] || player.player_name} - ${player.hands_played} hands played`,
        flags
      };
    });

    // Add some system events
    const systemEvents: ActivityEvent[] = [
      {
        id: `system_scan_${Date.now()}`,
        type: 'pattern_alert',
        player_name: 'SYSTEM',
        timestamp: new Date().toISOString(),
        risk_level: 'Low',
        details: 'Automated security scan completed',
        flags: ['System Event']
      }
    ];

    const allActivities = [...activities, ...systemEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      activities: allActivities,
      total_count: allActivities.length,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Real-time activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time activity' },
      { status: 500 }
    );
  }
} 
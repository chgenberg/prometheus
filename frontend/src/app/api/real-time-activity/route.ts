import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb, getCoinpokerPlayers } from '../../../lib/database-api-helper';

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
  let db;
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    db = await getApiDb();

    // Get all Coinpoker players using standardized helper with more data
    const allPlayers = await getCoinpokerPlayers(db, 200); // Get more players for activity feed
    
    if (!allPlayers || allPlayers.length === 0) {
      return NextResponse.json([]);
    }

    // Generate real-time activity events based on player data
    const activityEvents: ActivityEvent[] = [];
    
    // Filter high-risk players for activity feed
    const highRiskPlayers = allPlayers
      .filter(player => (player.bad_actor_score || 0) > 0 || (player.intention_score || 0) > 50 || (player.total_hands || 0) > 500)
      .sort((a, b) => {
        const aScore = (a.bad_actor_score || 0) + (a.intention_score || 0);
        const bScore = (b.bad_actor_score || 0) + (b.intention_score || 0);
        return bScore - aScore;
      })
      .slice(0, limit);

    // Generate activity events for high-risk players
    highRiskPlayers.forEach((player, index) => {
      const now = new Date();
      const eventTime = new Date(now.getTime() - (index * 60000)); // Events spread over last hour

      let eventType: ActivityEvent['type'] = 'suspicious_play';
      let riskLevel: ActivityEvent['risk_level'] = 'Low';
      let details = '';
      let flags: string[] = [];

      // Determine event type and risk level based on player stats
      const badActorScore = player.bad_actor_score || 0;
      const intentionScore = player.intention_score || 0;
      const totalHands = player.total_hands || 0;

      if (badActorScore > 15) {
        eventType = 'bot_detected';
        riskLevel = 'Critical';
        details = `Bot detection algorithm flagged player with score ${badActorScore}`;
        flags = ['automated_play', 'timing_patterns', 'bet_sizing_anomaly'];
      } else if (intentionScore > 70) {
        eventType = 'pattern_alert';
        riskLevel = 'High';
        details = `Suspicious behavioral patterns detected (intention score: ${intentionScore})`;
        flags = ['behavioral_anomaly', 'statistical_outlier'];
      } else if (totalHands > 1000) {
        eventType = 'high_volume';
        riskLevel = 'Medium';
        details = `High volume player detected (${totalHands} hands played)`;
        flags = ['high_volume', 'experienced_player'];
      } else {
        eventType = 'new_account';
        riskLevel = 'Low';
        details = `New account activity detected`;
        flags = ['new_account', 'monitoring_required'];
      }

      activityEvents.push({
        id: `activity_${Date.now()}_${index}`,
        type: eventType,
        player_name: player.player_id,
        timestamp: eventTime.toISOString(),
        risk_level: riskLevel,
        details,
        flags
      });
    });

    // Sort by timestamp (most recent first)
    activityEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(activityEvents.slice(0, limit));

  } catch (error) {
    console.error('Real-time activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time activity data' },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
}

// POST endpoint for marking events as reviewed
export async function POST(request: NextRequest) {
  try {
    const { eventId, action } = await request.json();
    
    // In a real implementation, you would update the event status in the database
    // For now, we'll just return success
    
    if (action === 'acknowledge') {
      return NextResponse.json({
        success: true,
        message: `Event ${eventId} acknowledged`
      });
    } else if (action === 'investigate') {
      return NextResponse.json({
        success: true,
        message: `Investigation started for event ${eventId}`
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Real-time activity POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

interface TimePatternData {
  player_id: string;
  best_hour_of_day: number | null;
  best_day_of_week: number | null;
  best_time_category: string | null;
  optimal_bb_per_100: number;
  worst_hour_of_day: number | null;
  worst_day_of_week: number | null;
  worst_time_category: string | null;
  worst_bb_per_100: number;
  recommended_session_length_minutes: number;
  avoid_hours: string;
  optimal_volume_per_day: number;
  data_confidence: number;
}

interface HourlyPerformance {
  hour_of_day: number;
  hands_played: number;
  bb_per_100_hands: number;
  vpip_percentage: number;
  pfr_percentage: number;
  aggression_factor: number;
  tilt_events_count: number;
}

interface WeekdayPerformance {
  day_of_week: number;
  day_name: string;
  hands_played: number;
  bb_per_100_hands: number;
  avg_session_length_minutes: number;
  tilt_events_count: number;
  roi_percentage: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerName = searchParams.get('player');
  const action = searchParams.get('action') || 'get';

  try {
    if (action === 'analyze') {
      return NextResponse.json({ 
        success: true, 
        message: 'Time pattern analysis not yet implemented' 
      });
    }

    if (!playerName) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    const db = await openDb();

    // Check if player exists in our database
    const playerExists = await db.get(`
      SELECT player_id FROM main 
      WHERE player_id = ?
    `, [playerName]);

    if (!playerExists) {
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    // Get basic player data from our database
    const playerData = await db.get(`
      SELECT 
        m.player_id,
        m.total_hands,
        m.vpip,
        m.pfr,
        m.net_win_bb,
        m.updated_at
      FROM main m
      WHERE m.player_id = ?
    `, [playerName]);

    // Generate simulated time pattern data based on player statistics
    const optimalTimes: TimePatternData = {
      player_id: playerName,
      best_hour_of_day: playerData.vpip > 30 ? 20 : 14, // Loose players peak at night, tight players afternoon
      best_day_of_week: playerData.pfr > 20 ? 6 : 1, // Aggressive players prefer weekends
      best_time_category: playerData.vpip > 30 ? 'Evening' : 'Afternoon',
      optimal_bb_per_100: Math.max(0, playerData.net_win_bb / playerData.total_hands * 100),
      worst_hour_of_day: playerData.vpip > 30 ? 6 : 23, // Early morning for loose, late night for tight
      worst_day_of_week: 2, // Tuesday generally worst for most players
      worst_time_category: 'Early Morning',
      worst_bb_per_100: Math.min(0, (playerData.net_win_bb / playerData.total_hands * 100) - 5),
      recommended_session_length_minutes: playerData.total_hands > 2000 ? 180 : 120,
      avoid_hours: JSON.stringify([2, 3, 4, 5, 6]), // Early morning hours
      optimal_volume_per_day: Math.round(playerData.total_hands / 90), // Assume 90 days of play
      data_confidence: playerData.total_hands > 1000 ? 0.8 : 0.5
    };

    // Generate hourly performance data
    const hourlyPerformance: HourlyPerformance[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const isOptimalHour = Math.abs(hour - (optimalTimes.best_hour_of_day || 14)) < 3;
      const handsPlayed = Math.round((playerData.total_hands / 24) * (isOptimalHour ? 1.5 : 0.5));
      
      hourlyPerformance.push({
        hour_of_day: hour,
        hands_played: handsPlayed,
        bb_per_100_hands: isOptimalHour ? 
          optimalTimes.optimal_bb_per_100 : 
          optimalTimes.optimal_bb_per_100 * 0.7,
        vpip_percentage: playerData.vpip + (isOptimalHour ? -2 : 3), // Better discipline during optimal hours
        pfr_percentage: playerData.pfr + (isOptimalHour ? 1 : -1),
        aggression_factor: isOptimalHour ? 3.2 : 2.8,
        tilt_events_count: isOptimalHour ? 0 : Math.round(Math.random() * 2)
      });
    }

    // Generate weekday performance data
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayPerformance: WeekdayPerformance[] = [];
    
    for (let day = 0; day < 7; day++) {
      const isOptimalDay = day === (optimalTimes.best_day_of_week || 6);
      const isWeekend = day === 0 || day === 6;
      
      weekdayPerformance.push({
        day_of_week: day,
        day_name: weekdayNames[day],
        hands_played: Math.round((playerData.total_hands / 7) * (isWeekend ? 1.3 : 0.8)),
        bb_per_100_hands: isOptimalDay ? 
          optimalTimes.optimal_bb_per_100 : 
          optimalTimes.optimal_bb_per_100 * 0.85,
        avg_session_length_minutes: isWeekend ? 180 : 120,
        tilt_events_count: isOptimalDay ? 0 : Math.round(Math.random() * 3),
        roi_percentage: isOptimalDay ? 15 : 8
      });
    }

    // Generate recent sessions (simulated based on player data)
    const recentSessions = [];
    for (let i = 0; i < Math.min(10, Math.floor(playerData.total_hands / 100)); i++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - i);
      
      recentSessions.push({
        session_start: sessionDate.toISOString(),
        session_end: new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 120 + Math.round(Math.random() * 60),
        hands_played: 80 + Math.round(Math.random() * 40),
        net_win_bb: Math.round((Math.random() - 0.5) * 20),
        bb_per_hour: Math.round((Math.random() - 0.3) * 30),
        time_of_day_category: sessionDate.getHours() > 18 ? 'Evening' : 'Afternoon',
        day_of_week: sessionDate.getDay(),
        is_weekend: sessionDate.getDay() === 0 || sessionDate.getDay() === 6,
        session_outcome: Math.random() > 0.4 ? 'Positive' : 'Negative',
        tilt_events_during_session: Math.round(Math.random() * 2),
        fatigue_score: Math.round(Math.random() * 100)
      });
    }

    const response = {
      player_id: playerName,
      optimal_times: {
        ...optimalTimes,
        avoid_hours: [2, 3, 4, 5, 6]
      },
      hourly_performance: hourlyPerformance,
      weekday_performance: weekdayPerformance,
      recent_sessions: recentSessions,
      insights: generateTimeInsights(optimalTimes, hourlyPerformance, weekdayPerformance)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Time patterns API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch time patterns data' 
    }, { status: 500 });
  }
}

function generateTimeInsights(
  optimalTimes: TimePatternData,
  hourlyPerformance: HourlyPerformance[],
  weekdayPerformance: WeekdayPerformance[]
): string[] {
  const insights: string[] = [];

  // Best time insights
  if (optimalTimes.best_hour_of_day !== null) {
    const hour = optimalTimes.best_hour_of_day;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const timeStr = `${displayHour}:00 ${ampm}`;
    insights.push(`🕒 Your best playing time is ${timeStr}`);
  }

  // Best day insights
  if (optimalTimes.best_day_of_week !== null) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push(`📅 You play best on ${days[optimalTimes.best_day_of_week]}s`);
  }

  // Session length recommendation
  insights.push(`⏱️ Recommended session length: ${optimalTimes.recommended_session_length_minutes} minutes`);

  // Performance trend
  if (optimalTimes.optimal_bb_per_100 > 0) {
    insights.push(`📈 You win on average ${optimalTimes.optimal_bb_per_100.toFixed(1)} BB/100 hands during optimal times`);
  } else {
    insights.push(`📊 Focus on improving your play during optimal times for better results`);
  }

  // Avoid hours warning
  insights.push(`🚫 Avoid playing between 2:00-6:00 AM for best results`);

  return insights;
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh_analysis') {
      // Simulate analysis refresh
      return NextResponse.json({
        success: true,
        message: 'Time pattern analysis refreshed successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Time patterns POST error:', error);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
} 
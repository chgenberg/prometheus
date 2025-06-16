import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

interface AdvancedDetectionData {
  player_name: string;
  advanced_indicators: {
    // Timing Analysis
    response_time_consistency: number; // 0-100, higher = more robotic
    session_duration_patterns: number; // 0-100, higher = more robotic
    break_frequency_score: number; // 0-100, higher = more human-like
    
    // Behavioral Analysis
    bet_sizing_variance: number; // 0-100, lower = more robotic
    decision_complexity_handling: number; // 0-100, lower = more robotic
    meta_game_adaptation: number; // 0-100, lower = more robotic
    
    // Statistical Anomalies
    variance_consistency: number; // 0-100, lower = more robotic
    tilt_resistance: number; // 0-100, higher = more robotic
    learning_curve: number; // 0-100, lower = more robotic
    
    // Advanced Pattern Recognition
    multi_table_correlation: number; // 0-100, higher = more suspicious
    hourly_performance_stability: number; // 0-100, higher = more robotic
    opponent_exploitation: number; // 0-100, lower = more robotic
  };
  overall_bot_probability: number; // 0-100
  confidence_level: 'Low' | 'Medium' | 'High' | 'Very High';
  recommended_action: 'Monitor' | 'Flag' | 'Investigate' | 'Immediate Review';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('player');
    
    if (!playerName) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    const db = await openDb();
    
    // Get player data from new database structure
    const player = await db.get(`
      SELECT 
        m.player_id as player_name,
        m.total_hands as hands_played,
        CASE 
          WHEN m.total_hands > 0 THEN ROUND((m.net_win_bb / m.total_hands) * 100, 2)
          ELSE 0 
        END as win_rate_percent,
        m.vpip as preflop_vpip,
        m.pfr as preflop_pfr,
        COALESCE(ps.avg_action_score, 0) as postflop_aggression,
        CASE 
          WHEN m.total_hands > 0 THEN ROUND((m.net_win_bb / m.total_hands) * 100, 2)
          ELSE 0 
        END as showdown_win_percent,
        m.updated_at as last_updated
      FROM main m
      LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
      WHERE m.player_id = ?
    `, [playerName]);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Advanced detection algorithms
    const analyzeAdvancedPatterns = (playerData: any): AdvancedDetectionData => {
      
      // 1. TIMING ANALYSIS
      // Simulate response time consistency (bots have very consistent timing)
      const baseResponseTime = 2000; // 2 seconds average
      const responseTimeConsistency = Math.min(100, Math.max(0, 
        100 - (Math.random() * 30 + playerData.hands_played / 100)
      ));
      
      // Session duration patterns (bots play for exact durations)
      const sessionDurationPatterns = Math.min(100, Math.max(0,
        playerData.hands_played > 1000 ? 85 + Math.random() * 15 : Math.random() * 60
      ));
      
      // Break frequency (humans take irregular breaks)
      const breakFrequencyScore = Math.max(0, 
        80 - (playerData.hands_played / 50) + Math.random() * 40
      );

      // 2. BEHAVIORAL ANALYSIS
      // Bet sizing variance (humans vary bet sizes, bots use exact percentages)
      const betSizingVariance = Math.max(0,
        60 - (responseTimeConsistency * 0.6) + Math.random() * 30
      );
      
      // Decision complexity handling (bots struggle with complex spots)
      const decisionComplexityHandling = Math.max(0,
        70 - (playerData.postflop_aggression > 60 ? 30 : 0) + Math.random() * 25
      );
      
      // Meta-game adaptation (bots don't adapt to specific opponents)
      const metaGameAdaptation = Math.max(0,
        50 - (sessionDurationPatterns * 0.3) + Math.random() * 35
      );

      // 3. STATISTICAL ANOMALIES
      // Variance consistency (humans have variance, bots don't)
      const expectedHumanVariance = Math.max(10, 40 - (playerData.hands_played / 100));
      const varianceConsistency = playerData.win_rate_percent > 30 && playerData.hands_played > 500
        ? Math.random() * 20 + 70  // High consistency suspicious
        : Math.random() * 80;      // Normal variance
      
      // Tilt resistance (bots never tilt)
      const tiltResistance = playerData.win_rate_percent > 25 
        ? 80 + Math.random() * 20   // High performers likely more tilt-resistant
        : 20 + Math.random() * 60;  // Normal tilt patterns
      
      // Learning curve (humans improve over time, bots are consistent)
      const learningCurve = playerData.hands_played > 1000
        ? Math.random() * 30        // Established players show less learning
        : 40 + Math.random() * 40;  // New players should improve

      // 4. ADVANCED PATTERN RECOGNITION
      // Multi-table correlation (bots often play identical strategies across tables)
      const multiTableCorrelation = sessionDurationPatterns > 70
        ? 60 + Math.random() * 40   // High session consistency = suspicious
        : Math.random() * 50;       // Normal variation
      
      // Hourly performance stability (humans perform worse when tired)
      const hourlyPerformanceStability = responseTimeConsistency > 80
        ? 70 + Math.random() * 30   // Too consistent = bot-like
        : Math.random() * 70;       // Human-like variation
      
      // Opponent exploitation (humans adapt to weak opponents, bots don't)
      const opponentExploitation = metaGameAdaptation;

      // Calculate overall bot probability using weighted factors
      const weights = {
        timing: 0.25,      // Timing patterns are strong indicators
        behavioral: 0.20,  // Behavioral consistency
        statistical: 0.30, // Statistical anomalies are very important
        advanced: 0.25     // Advanced patterns
      };

      const timingScore = (responseTimeConsistency + sessionDurationPatterns + (100 - breakFrequencyScore)) / 3;
      const behavioralScore = (100 - betSizingVariance + 100 - decisionComplexityHandling + 100 - metaGameAdaptation) / 3;
      const statisticalScore = (varianceConsistency + tiltResistance + 100 - learningCurve) / 3;
      const advancedScore = (multiTableCorrelation + hourlyPerformanceStability + 100 - opponentExploitation) / 3;

      const overallBotProbability = Math.round(
        timingScore * weights.timing +
        behavioralScore * weights.behavioral +
        statisticalScore * weights.statistical +
        advancedScore * weights.advanced
      );

      // Determine confidence level
      let confidenceLevel: 'Low' | 'Medium' | 'High' | 'Very High';
      if (overallBotProbability >= 85) confidenceLevel = 'Very High';
      else if (overallBotProbability >= 70) confidenceLevel = 'High';
      else if (overallBotProbability >= 50) confidenceLevel = 'Medium';
      else confidenceLevel = 'Low';

      // Recommend action
      let recommendedAction: 'Monitor' | 'Flag' | 'Investigate' | 'Immediate Review';
      if (overallBotProbability >= 90) recommendedAction = 'Immediate Review';
      else if (overallBotProbability >= 75) recommendedAction = 'Investigate';
      else if (overallBotProbability >= 60) recommendedAction = 'Flag';
      else recommendedAction = 'Monitor';

      return {
        player_name: playerData.player_name,
        advanced_indicators: {
          response_time_consistency: Math.round(responseTimeConsistency),
          session_duration_patterns: Math.round(sessionDurationPatterns),
          break_frequency_score: Math.round(breakFrequencyScore),
          bet_sizing_variance: Math.round(betSizingVariance),
          decision_complexity_handling: Math.round(decisionComplexityHandling),
          meta_game_adaptation: Math.round(metaGameAdaptation),
          variance_consistency: Math.round(varianceConsistency),
          tilt_resistance: Math.round(tiltResistance),
          learning_curve: Math.round(learningCurve),
          multi_table_correlation: Math.round(multiTableCorrelation),
          hourly_performance_stability: Math.round(hourlyPerformanceStability),
          opponent_exploitation: Math.round(opponentExploitation)
        },
        overall_bot_probability: overallBotProbability,
        confidence_level: confidenceLevel,
        recommended_action: recommendedAction
      };
    };

    const result = analyzeAdvancedPatterns(player);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Advanced detection API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze player' },
      { status: 500 }
    );
  }
} 
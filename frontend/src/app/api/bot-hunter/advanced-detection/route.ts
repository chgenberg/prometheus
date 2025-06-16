import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../../lib/database-turso';

interface PlayerDetectionData {
  player_id: string;
  total_hands: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  avg_postflop_score: number;
  avg_preflop_score: number;
  bad_actor_score: number;
  intention_score: number;
  collution_score: number;
}

async function getCoinpokerPlayersForDetection(): Promise<PlayerDetectionData[]> {
  console.log('Fetching CoinPoker players from Turso for advanced bot detection...');
  
  const query = `
    SELECT 
      player_id,
      total_hands,
      net_win_bb,
      vpip,
      pfr,
      avg_postflop_score,
      avg_preflop_score,
      bad_actor_score,
      intention_score,
      collution_score
    FROM main
    WHERE player_id LIKE 'CoinPoker%'
    AND total_hands > 200
    ORDER BY total_hands DESC
  `;
  
  try {
    const result = await queryTurso(query);
    console.log(`Found ${result.rows.length} CoinPoker players for advanced detection`);
    
    return result.rows.map((row: any) => ({
      player_id: row.player_id,
      total_hands: row.total_hands || 0,
      net_win_bb: row.net_win_bb || 0,
      vpip: row.vpip || 0,
      pfr: row.pfr || 0,
      avg_postflop_score: row.avg_postflop_score || 0,
      avg_preflop_score: row.avg_preflop_score || 0,
      bad_actor_score: row.bad_actor_score || 0,
      intention_score: row.intention_score || 0,
      collution_score: row.collution_score || 0,
    }));
  } catch (error) {
    console.error('Error fetching players from Turso for advanced detection:', error);
    throw error;
  }
}

function performAdvancedBotDetection(player: PlayerDetectionData) {
  const detectionAlgorithms = [];
  
  // Algorithm 1: Statistical Deviation Analysis
  const vpipDeviation = Math.abs(player.vpip - 25); // 25% is typical VPIP
  const pfrDeviation = Math.abs(player.pfr - 18); // 18% is typical PFR
  const pfrVpipRatio = player.vpip > 0 ? player.pfr / player.vpip : 0;
  
  let statisticalScore = 0;
  if (vpipDeviation > 20) statisticalScore += 25; // Very unusual VPIP
  if (pfrDeviation > 15) statisticalScore += 25; // Very unusual PFR
  if (pfrVpipRatio > 0.9 || pfrVpipRatio < 0.4) statisticalScore += 20; // Unusual PFR/VPIP ratio
  
  detectionAlgorithms.push({
    algorithm: 'Statistical Deviation Analysis',
    score: statisticalScore,
    indicators: [
      { metric: 'VPIP Deviation', value: vpipDeviation, threshold: 20, flagged: vpipDeviation > 20 },
      { metric: 'PFR Deviation', value: pfrDeviation, threshold: 15, flagged: pfrDeviation > 15 },
      { metric: 'PFR/VPIP Ratio', value: pfrVpipRatio, threshold: '0.4-0.9', flagged: pfrVpipRatio > 0.9 || pfrVpipRatio < 0.4 }
    ]
  });

  // Algorithm 2: Behavioral Consistency Analysis
  const consistencyScore = Math.max(player.avg_preflop_score, player.avg_postflop_score);
  let behavioralScore = 0;
  
  // Perfect play consistency (possible bot indicator)
  if (consistencyScore > 95) behavioralScore += 30;
  else if (consistencyScore > 90) behavioralScore += 15;
  
  // Very poor consistency (possible bot indicator)
  if (consistencyScore < 10) behavioralScore += 25;
  
  detectionAlgorithms.push({
    algorithm: 'Behavioral Consistency Analysis',
    score: behavioralScore,
    indicators: [
      { metric: 'Preflop Consistency', value: player.avg_preflop_score, threshold: 90, flagged: player.avg_preflop_score > 90 || player.avg_preflop_score < 10 },
      { metric: 'Postflop Consistency', value: player.avg_postflop_score, threshold: 90, flagged: player.avg_postflop_score > 90 || player.avg_postflop_score < 10 }
    ]
  });

  // Algorithm 3: Win Rate vs Volume Analysis
  const winRateBB100 = (player.net_win_bb / player.total_hands) * 100;
  const volumeCategory = player.total_hands > 2000 ? 'High' : player.total_hands > 1000 ? 'Medium' : 'Low';
  
  let winVolumeScore = 0;
  
  // Suspiciously high win rate with high volume
  if (winRateBB100 > 10 && player.total_hands > 2000) winVolumeScore += 40;
  else if (winRateBB100 > 15 && player.total_hands > 1000) winVolumeScore += 30;
  
  // Suspiciously consistent results
  if (Math.abs(winRateBB100) < 0.5 && player.total_hands > 1000) winVolumeScore += 20; // Too break-even
  
  detectionAlgorithms.push({
    algorithm: 'Win Rate vs Volume Analysis',
    score: winVolumeScore,
    indicators: [
      { metric: 'Win Rate BB/100', value: winRateBB100, threshold: 10, flagged: winRateBB100 > 10 && player.total_hands > 2000 },
      { metric: 'Volume Category', value: volumeCategory, threshold: 'High', flagged: player.total_hands > 2000 },
      { metric: 'Consistency', value: Math.abs(winRateBB100), threshold: 0.5, flagged: Math.abs(winRateBB100) < 0.5 && player.total_hands > 1000 }
    ]
  });

  // Algorithm 4: Risk Score Integration
  const riskThreshold = 70;
  let riskScore = 0;
  
  if (player.bad_actor_score > riskThreshold) riskScore += 35;
  if (player.intention_score > riskThreshold) riskScore += 30;
  if (player.collution_score > riskThreshold) riskScore += 25;
  
  detectionAlgorithms.push({
    algorithm: 'Risk Score Integration',
    score: riskScore,
    indicators: [
      { metric: 'Bad Actor Score', value: player.bad_actor_score, threshold: riskThreshold, flagged: player.bad_actor_score > riskThreshold },
      { metric: 'Intention Score', value: player.intention_score, threshold: riskThreshold, flagged: player.intention_score > riskThreshold },
      { metric: 'Collusion Score', value: player.collution_score, threshold: riskThreshold, flagged: player.collution_score > riskThreshold }
    ]
  });

  // Calculate composite score
  const totalScore = detectionAlgorithms.reduce((sum, alg) => sum + alg.score, 0);
  const maxPossibleScore = 130; // Sum of all max scores
  const normalizedScore = Math.min(100, (totalScore / maxPossibleScore) * 100);

  // Determine bot likelihood
  let likelihood = 'HUMAN';
  if (normalizedScore >= 80) likelihood = 'VERY_HIGH_BOT_PROBABILITY';
  else if (normalizedScore >= 60) likelihood = 'HIGH_BOT_PROBABILITY';
  else if (normalizedScore >= 40) likelihood = 'MODERATE_BOT_PROBABILITY';
  else if (normalizedScore >= 20) likelihood = 'LOW_BOT_PROBABILITY';

  // Generate recommendations
  const recommendations = [];
  if (normalizedScore >= 60) {
    recommendations.push('Immediate manual review recommended');
    recommendations.push('Consider temporary account restriction');
  }
  if (normalizedScore >= 40) {
    recommendations.push('Enhanced monitoring required');
    recommendations.push('Flag for detailed behavioral analysis');
  }
  if (detectionAlgorithms.some(alg => alg.score >= 30)) {
    recommendations.push('Review recent hand history');
  }

  return {
    player_id: player.player_id,
    detection_score: Math.round(normalizedScore * 10) / 10,
    bot_likelihood: likelihood,
    algorithms: detectionAlgorithms,
    recommendations: recommendations,
    confidence_level: player.total_hands > 2000 ? 'HIGH' : player.total_hands > 1000 ? 'MEDIUM' : 'LOW',
    sample_size: player.total_hands,
    analysis_timestamp: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player_id');
    const minHands = parseInt(searchParams.get('min_hands') || '200');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Get players data
    let players = await getCoinpokerPlayersForDetection();
    
    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players found with sufficient data for advanced detection',
        advanced_detections: [],
        timestamp: new Date().toISOString()
      });
    }

    // Filter by minimum hands
    players = players.filter(p => p.total_hands >= minHands);

    // Filter for specific player if requested
    if (playerId) {
      players = players.filter(p => 
        p.player_id.toLowerCase().includes(playerId.toLowerCase())
      );
      
      if (players.length === 0) {
        return NextResponse.json({
          error: `Player ${playerId} not found or insufficient hands`,
          advanced_detections: [],
          timestamp: new Date().toISOString()
        });
      }
    }

    // Limit results
    players = players.slice(0, limit);

    // Perform advanced detection on each player
    const advancedDetections = players.map(player => performAdvancedBotDetection(player));

    // Sort by detection score (highest first)
    advancedDetections.sort((a, b) => b.detection_score - a.detection_score);

    // Calculate summary statistics
    const summaryStats = {
      total_players_analyzed: advancedDetections.length,
      high_risk_detections: advancedDetections.filter(d => d.detection_score >= 60).length,
      moderate_risk_detections: advancedDetections.filter(d => d.detection_score >= 40 && d.detection_score < 60).length,
      low_risk_detections: advancedDetections.filter(d => d.detection_score >= 20 && d.detection_score < 40).length,
      human_classifications: advancedDetections.filter(d => d.detection_score < 20).length,
      avg_detection_score: Math.round(advancedDetections.reduce((sum, d) => sum + d.detection_score, 0) / advancedDetections.length * 10) / 10,
      manual_review_recommended: advancedDetections.filter(d => d.recommendations.includes('Immediate manual review recommended')).length
    };

    // Most common indicators
    const allIndicators = advancedDetections.flatMap(d => 
      d.algorithms.flatMap(alg => alg.indicators.filter(ind => ind.flagged))
    );
    
    const indicatorCounts = allIndicators.reduce((acc, indicator) => {
      acc[indicator.metric] = (acc[indicator.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIndicators = Object.entries(indicatorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([metric, count]) => ({ metric, count }));

    const response = {
      advanced_detections: advancedDetections,
      summary_statistics: summaryStats,
      top_risk_indicators: topIndicators,
      detection_parameters: {
        minimum_hands_required: minHands,
        algorithms_used: [
          'Statistical Deviation Analysis',
          'Behavioral Consistency Analysis', 
          'Win Rate vs Volume Analysis',
          'Risk Score Integration'
        ],
        confidence_levels: ['HIGH: 2000+ hands', 'MEDIUM: 1000-2000 hands', 'LOW: <1000 hands']
      },
      methodology: {
        scoring: 'Composite score from 4 detection algorithms (0-100 scale)',
        thresholds: {
          'VERY_HIGH_BOT_PROBABILITY': '80+',
          'HIGH_BOT_PROBABILITY': '60-79',
          'MODERATE_BOT_PROBABILITY': '40-59',
          'LOW_BOT_PROBABILITY': '20-39',
          'HUMAN': '<20'
        }
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Advanced bot detection API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform advanced bot detection' },
      { status: 500 }
    );
  }
} 
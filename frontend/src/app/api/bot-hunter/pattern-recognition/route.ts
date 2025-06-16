import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../../lib/database-turso';

interface PlayerPatternData {
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

async function getCoinpokerPlayersForPatterns(): Promise<PlayerPatternData[]> {
  console.log('Fetching CoinPoker players from Turso for pattern recognition...');
  
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
    AND total_hands > 100
    ORDER BY total_hands DESC
  `;
  
  try {
    const result = await queryTurso(query);
    console.log(`Found ${result.rows.length} CoinPoker players for pattern recognition`);
    
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
    console.error('Error fetching players from Turso for pattern recognition:', error);
    throw error;
  }
}

function analyzePlayerPatterns(players: PlayerPatternData[]) {
  const patterns = [];

  // Pattern 1: Perfect Statistical Clustering
  const perfectStats = players.filter(p => {
    const vpipRounded = Math.round(p.vpip);
    const pfrRounded = Math.round(p.pfr);
    
    // Look for players with exactly same rounded stats (suspicious)
    return players.filter(other => 
      other.player_id !== p.player_id &&
      Math.round(other.vpip) === vpipRounded &&
      Math.round(other.pfr) === pfrRounded &&
      Math.abs(other.avg_preflop_score - p.avg_preflop_score) < 5
    ).length > 0;
  });

  if (perfectStats.length > 5) {
    patterns.push({
      pattern_type: 'STATISTICAL_CLUSTERING',
      severity: 'HIGH',
      description: 'Multiple players with identical or near-identical statistics',
      affected_players: perfectStats.slice(0, 10).map(p => p.player_id),
      risk_score: 85,
      indicators: [
        'Identical VPIP/PFR values across multiple accounts',
        'Similar preflop play patterns',
        'Clustering suggests automated play'
      ]
    });
  }

  // Pattern 2: Progression Anomalies
  const progressionAnomalies = players.filter(p => {
    // Look for unnatural progression (too perfect or too random)
    const winRateBB100 = (p.net_win_bb / p.total_hands) * 100;
    const skillScore = (p.avg_preflop_score + p.avg_postflop_score) / 2;
    
    // Suspiciously high skill with moderate volume
    return (skillScore > 90 && p.total_hands > 500 && p.total_hands < 2000) ||
           (Math.abs(winRateBB100) < 0.1 && p.total_hands > 1000); // Too break-even
  });

  if (progressionAnomalies.length > 0) {
    patterns.push({
      pattern_type: 'PROGRESSION_ANOMALY',
      severity: progressionAnomalies.length > 5 ? 'HIGH' : 'MEDIUM',
      description: 'Unnatural skill progression or results',
      affected_players: progressionAnomalies.slice(0, 8).map(p => p.player_id),
      risk_score: progressionAnomalies.length > 5 ? 75 : 45,
      indicators: [
        'Suspiciously high skill scores with limited experience',
        'Unnaturally consistent results',
        'Lack of typical learning curve'
      ]
    });
  }

  // Pattern 3: Risk Score Correlation
  const highRiskCluster = players.filter(p => 
    p.bad_actor_score > 70 || p.intention_score > 70 || p.collution_score > 70
  );

  // Look for patterns in high-risk players
  const riskPatterns = [];
  if (highRiskCluster.length > 10) {
    const avgVpip = highRiskCluster.reduce((sum, p) => sum + p.vpip, 0) / highRiskCluster.length;
    const avgPfr = highRiskCluster.reduce((sum, p) => sum + p.pfr, 0) / highRiskCluster.length;
    
    riskPatterns.push({
      pattern_type: 'HIGH_RISK_CLUSTERING',
      severity: 'HIGH',
      description: 'Large cluster of high-risk players with similar characteristics',
      affected_players: highRiskCluster.slice(0, 15).map(p => p.player_id),
      risk_score: 80,
      indicators: [
        `${highRiskCluster.length} players flagged with high risk scores`,
        `Average VPIP: ${Math.round(avgVpip * 10) / 10}%`,
        `Average PFR: ${Math.round(avgPfr * 10) / 10}%`,
        'Potential coordinated suspicious activity'
      ]
    });
  }

  // Pattern 4: Volume Distribution Analysis
  const volumeGroups = {
    low: players.filter(p => p.total_hands < 500),
    medium: players.filter(p => p.total_hands >= 500 && p.total_hands < 2000),
    high: players.filter(p => p.total_hands >= 2000)
  };

  // Analyze win rates by volume group
  Object.entries(volumeGroups).forEach(([volume, group]) => {
    if (group.length > 10) {
      const winRates = group.map(p => (p.net_win_bb / p.total_hands) * 100);
      const avgWinRate = winRates.reduce((sum, wr) => sum + wr, 0) / winRates.length;
      const stdDev = Math.sqrt(winRates.reduce((sum, wr) => sum + Math.pow(wr - avgWinRate, 2), 0) / winRates.length);

      // Suspiciously low variance in results
      if (stdDev < 2 && group.length > 15) {
        patterns.push({
          pattern_type: 'LOW_VARIANCE_CLUSTER',
          severity: 'MEDIUM',
          description: `${volume} volume players show unnaturally consistent results`,
          affected_players: group.slice(0, 12).map(p => p.player_id),
          risk_score: 60,
          indicators: [
            `Standard deviation: ${Math.round(stdDev * 100) / 100} BB/100`,
            'Unusually consistent win rates across players',
            'Possible result manipulation or bot network'
          ]
        });
      }
    }
  });

  // Pattern 5: Behavioral Synchronization
  const behaviorGroups: Record<string, PlayerPatternData[]> = {};
  players.forEach(player => {
    const behaviorKey = `${Math.round(player.vpip / 5) * 5}_${Math.round(player.pfr / 5) * 5}`;
    if (!behaviorGroups[behaviorKey]) {
      behaviorGroups[behaviorKey] = [];
    }
    behaviorGroups[behaviorKey].push(player);
  });

  // Find suspiciously large behavior groups
  Object.entries(behaviorGroups).forEach(([key, group]) => {
    if (group.length > 8) { // More than 8 players with very similar behavior
      const [vpipGroup, pfrGroup] = key.split('_').map(Number);
      patterns.push({
        pattern_type: 'BEHAVIORAL_SYNCHRONIZATION',
        severity: group.length > 15 ? 'HIGH' : 'MEDIUM',
        description: 'Large group of players with synchronized behavioral patterns',
        affected_players: group.slice(0, 10).map(p => p.player_id),
        risk_score: Math.min(90, 40 + group.length * 3),
        indicators: [
          `${group.length} players with VPIP ~${vpipGroup}% and PFR ~${pfrGroup}%`,
          'Potential bot network or coaching group',
          'Synchronized playing styles'
        ]
      });
    }
  });

  patterns.push(...riskPatterns);
  return patterns.sort((a, b) => b.risk_score - a.risk_score);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minRiskScore = parseInt(searchParams.get('min_risk_score') || '50');
    const patternType = searchParams.get('pattern_type');
    
    // Get players data
    const players = await getCoinpokerPlayersForPatterns();
    
    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players found for pattern recognition',
        patterns: [],
        timestamp: new Date().toISOString()
      });
    }

    // Analyze patterns
    let patterns = analyzePlayerPatterns(players);

    // Filter by minimum risk score
    patterns = patterns.filter(p => p.risk_score >= minRiskScore);

    // Filter by pattern type if specified
    if (patternType) {
      patterns = patterns.filter(p => 
        p.pattern_type.toLowerCase().includes(patternType.toLowerCase())
      );
    }

    // Calculate network analysis
    const networkStats = {
      total_players_analyzed: players.length,
      patterns_detected: patterns.length,
      high_severity_patterns: patterns.filter(p => p.severity === 'HIGH').length,
      medium_severity_patterns: patterns.filter(p => p.severity === 'MEDIUM').length,
      total_flagged_players: [...new Set(patterns.flatMap(p => p.affected_players))].length,
      avg_pattern_risk_score: patterns.length > 0 ? 
        Math.round(patterns.reduce((sum, p) => sum + p.risk_score, 0) / patterns.length * 10) / 10 : 0
    };

    // Pattern type distribution
    const patternTypeDistribution = patterns.reduce((acc, pattern) => {
      acc[pattern.pattern_type] = (acc[pattern.pattern_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most suspicious players (appearing in multiple patterns)
    const playerFrequency = patterns.flatMap(p => p.affected_players).reduce((acc, playerId) => {
      acc[playerId] = (acc[playerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostSuspiciousPlayers = Object.entries(playerFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([playerId, count]) => ({ player_id: playerId, pattern_count: count }));

    const response = {
      patterns: patterns,
      network_analysis: networkStats,
      pattern_distribution: patternTypeDistribution,
      most_suspicious_players: mostSuspiciousPlayers,
      analysis_parameters: {
        minimum_risk_score: minRiskScore,
        pattern_type_filter: patternType || 'all',
        detection_algorithms: [
          'Statistical Clustering Analysis',
          'Progression Anomaly Detection',
          'Risk Score Correlation',
          'Volume Distribution Analysis',
          'Behavioral Synchronization Detection'
        ]
      },
      recommendations: {
        immediate_action: patterns.filter(p => p.severity === 'HIGH' && p.risk_score >= 80).map(p => ({
          pattern: p.pattern_type,
          action: 'Manual investigation required',
          priority: 'URGENT'
        })),
        monitoring: patterns.filter(p => p.severity === 'MEDIUM').map(p => ({
          pattern: p.pattern_type,
          action: 'Enhanced monitoring',
          priority: 'MEDIUM'
        }))
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pattern recognition API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform pattern recognition' },
      { status: 500 }
    );
  }
} 
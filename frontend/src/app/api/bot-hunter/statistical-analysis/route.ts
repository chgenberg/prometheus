import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../../lib/database-turso';

interface PlayerStatisticalData {
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

async function getCoinpokerPlayersForStatistics(): Promise<PlayerStatisticalData[]> {
  console.log('Fetching CoinPoker players from Turso for statistical analysis...');
  
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
    console.log(`Found ${result.rows.length} CoinPoker players for statistical analysis`);
    
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
    console.error('Error fetching players from Turso for statistical analysis:', error);
    throw error;
  }
}

function performStatisticalAnalysis(players: PlayerStatisticalData[]) {
  if (players.length === 0) return null;

  // Calculate basic statistics
  const vpipValues = players.map(p => p.vpip);
  const pfrValues = players.map(p => p.pfr);
  const winRates = players.map(p => (p.net_win_bb / p.total_hands) * 100);
  const preflopScores = players.map(p => p.avg_preflop_score);
  const postflopScores = players.map(p => p.avg_postflop_score);
  const badActorScores = players.map(p => p.bad_actor_score);

  // Helper functions for statistics
  const mean = (values: number[]) => values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = (values: number[]) => {
    const avg = mean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  };
  const standardDeviation = (values: number[]) => Math.sqrt(variance(values));
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  // Percentile calculation
  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  // Z-score analysis for outlier detection
  const calculateZScores = (values: number[]) => {
    const avg = mean(values);
    const stdDev = standardDeviation(values);
    return values.map(val => stdDev > 0 ? (val - avg) / stdDev : 0);
  };

  // Statistical analysis
  const vpipStats = {
    mean: Math.round(mean(vpipValues) * 100) / 100,
    median: Math.round(median(vpipValues) * 100) / 100,
    std_dev: Math.round(standardDeviation(vpipValues) * 100) / 100,
    min: Math.min(...vpipValues),
    max: Math.max(...vpipValues),
    q25: Math.round(percentile(vpipValues, 25) * 100) / 100,
    q75: Math.round(percentile(vpipValues, 75) * 100) / 100,
    outliers: vpipValues.filter((_, i) => Math.abs(calculateZScores(vpipValues)[i]) > 2.5).length
  };

  const pfrStats = {
    mean: Math.round(mean(pfrValues) * 100) / 100,
    median: Math.round(median(pfrValues) * 100) / 100,
    std_dev: Math.round(standardDeviation(pfrValues) * 100) / 100,
    min: Math.min(...pfrValues),
    max: Math.max(...pfrValues),
    q25: Math.round(percentile(pfrValues, 25) * 100) / 100,
    q75: Math.round(percentile(pfrValues, 75) * 100) / 100,
    outliers: pfrValues.filter((_, i) => Math.abs(calculateZScores(pfrValues)[i]) > 2.5).length
  };

  const winRateStats = {
    mean: Math.round(mean(winRates) * 100) / 100,
    median: Math.round(median(winRates) * 100) / 100,
    std_dev: Math.round(standardDeviation(winRates) * 100) / 100,
    min: Math.round(Math.min(...winRates) * 100) / 100,
    max: Math.round(Math.max(...winRates) * 100) / 100,
    q25: Math.round(percentile(winRates, 25) * 100) / 100,
    q75: Math.round(percentile(winRates, 75) * 100) / 100,
    outliers: winRates.filter((_, i) => Math.abs(calculateZScores(winRates)[i]) > 2.5).length
  };

  // Correlation analysis
  const correlation = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator !== 0 ? numerator / denominator : 0;
  };

  const correlations = {
    vpip_pfr: Math.round(correlation(vpipValues, pfrValues) * 1000) / 1000,
    vpip_winrate: Math.round(correlation(vpipValues, winRates) * 1000) / 1000,
    pfr_winrate: Math.round(correlation(pfrValues, winRates) * 1000) / 1000,
    preflop_postflop: Math.round(correlation(preflopScores, postflopScores) * 1000) / 1000,
    bad_actor_winrate: Math.round(correlation(badActorScores, winRates) * 1000) / 1000
  };

  // Outlier detection
  const vpipZScores = calculateZScores(vpipValues);
  const pfrZScores = calculateZScores(pfrValues);
  const winRateZScores = calculateZScores(winRates);

  const outliers = players.filter((_, i) => 
    Math.abs(vpipZScores[i]) > 2.5 || 
    Math.abs(pfrZScores[i]) > 2.5 || 
    Math.abs(winRateZScores[i]) > 2.5
  ).map((player, i) => {
    const playerIndex = players.indexOf(player);
    return {
      player_id: player.player_id,
      vpip_z_score: Math.round(vpipZScores[playerIndex] * 100) / 100,
      pfr_z_score: Math.round(pfrZScores[playerIndex] * 100) / 100,
      winrate_z_score: Math.round(winRateZScores[playerIndex] * 100) / 100,
      flags: [
        ...(Math.abs(vpipZScores[playerIndex]) > 2.5 ? ['VPIP_OUTLIER'] : []),
        ...(Math.abs(pfrZScores[playerIndex]) > 2.5 ? ['PFR_OUTLIER'] : []),
        ...(Math.abs(winRateZScores[playerIndex]) > 2.5 ? ['WINRATE_OUTLIER'] : [])
      ]
    };
  });

  // Distribution analysis
  const vpipDistribution = {
    tight: vpipValues.filter(v => v < 15).length,
    standard: vpipValues.filter(v => v >= 15 && v < 25).length,
    loose: vpipValues.filter(v => v >= 25 && v < 35).length,
    very_loose: vpipValues.filter(v => v >= 35).length
  };

  const winRateDistribution = {
    big_losers: winRates.filter(wr => wr < -5).length,
    small_losers: winRates.filter(wr => wr >= -5 && wr < 0).length,
    break_even: winRates.filter(wr => wr >= 0 && wr < 2).length,
    small_winners: winRates.filter(wr => wr >= 2 && wr < 5).length,
    big_winners: winRates.filter(wr => wr >= 5).length
  };

  return {
    sample_size: players.length,
    vpip_statistics: vpipStats,
    pfr_statistics: pfrStats,
    winrate_statistics: winRateStats,
    correlations: correlations,
    outliers: outliers.slice(0, 20), // Limit to top 20 outliers
    distributions: {
      vpip: vpipDistribution,
      winrate: winRateDistribution
    },
    normality_tests: {
      vpip_normal: vpipStats.std_dev > 0 && Math.abs(vpipStats.mean - vpipStats.median) < vpipStats.std_dev / 3,
      pfr_normal: pfrStats.std_dev > 0 && Math.abs(pfrStats.mean - pfrStats.median) < pfrStats.std_dev / 3,
      winrate_normal: winRateStats.std_dev > 0 && Math.abs(winRateStats.mean - winRateStats.median) < winRateStats.std_dev / 3
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player_id');
    const minHands = parseInt(searchParams.get('min_hands') || '100');
    
    // Get players data
    let players = await getCoinpokerPlayersForStatistics();
    
    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players found for statistical analysis',
        statistical_analysis: null,
        timestamp: new Date().toISOString()
      });
    }

    // Filter by minimum hands
    players = players.filter(p => p.total_hands >= minHands);

    // Filter for specific player if requested (for comparative analysis)
    let targetPlayer = null;
    if (playerId) {
      targetPlayer = players.find(p => 
        p.player_id.toLowerCase().includes(playerId.toLowerCase())
      );
      
      if (!targetPlayer) {
        return NextResponse.json({
          error: `Player ${playerId} not found`,
          statistical_analysis: null,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Perform statistical analysis
    const analysis = performStatisticalAnalysis(players);
    
    if (!analysis) {
      return NextResponse.json({
        error: 'Unable to perform statistical analysis',
        statistical_analysis: null,
        timestamp: new Date().toISOString()
      });
    }

    // If specific player requested, add comparative analysis
    let playerComparison = null;
    if (targetPlayer && analysis) {
      const playerVpipPercentile = (players.filter(p => p.vpip < targetPlayer.vpip).length / players.length) * 100;
      const playerPfrPercentile = (players.filter(p => p.pfr < targetPlayer.pfr).length / players.length) * 100;
      const playerWinRate = (targetPlayer.net_win_bb / targetPlayer.total_hands) * 100;
      const playerWinRatePercentile = (players.filter(p => (p.net_win_bb / p.total_hands) * 100 < playerWinRate).length / players.length) * 100;

      playerComparison = {
        player_id: targetPlayer.player_id,
        player_stats: {
          vpip: targetPlayer.vpip,
          pfr: targetPlayer.pfr,
          winrate_bb100: Math.round(playerWinRate * 100) / 100,
          total_hands: targetPlayer.total_hands
        },
        percentiles: {
          vpip_percentile: Math.round(playerVpipPercentile * 10) / 10,
          pfr_percentile: Math.round(playerPfrPercentile * 10) / 10,
          winrate_percentile: Math.round(playerWinRatePercentile * 10) / 10
        },
        z_scores: {
          vpip_z: Math.round(((targetPlayer.vpip - analysis.vpip_statistics.mean) / analysis.vpip_statistics.std_dev) * 100) / 100,
          pfr_z: Math.round(((targetPlayer.pfr - analysis.pfr_statistics.mean) / analysis.pfr_statistics.std_dev) * 100) / 100,
          winrate_z: Math.round(((playerWinRate - analysis.winrate_statistics.mean) / analysis.winrate_statistics.std_dev) * 100) / 100
        }
      };
    }

    const response = {
      statistical_analysis: analysis,
      player_comparison: playerComparison,
      analysis_parameters: {
        minimum_hands: minHands,
        player_filter: playerId || 'population_analysis',
        statistical_methods: [
          'Descriptive Statistics',
          'Outlier Detection (Z-score > 2.5)',
          'Correlation Analysis',
          'Distribution Analysis',
          'Normality Testing'
        ]
      },
      interpretation: {
        strong_correlations: Object.entries(analysis.correlations)
          .filter(([_, corr]) => Math.abs(corr) > 0.7)
          .map(([metric, corr]) => ({ metric, correlation: corr })),
        high_risk_patterns: [
          ...(analysis.outliers.length > analysis.sample_size * 0.1 ? ['High outlier rate detected'] : []),
          ...(Math.abs(analysis.correlations.bad_actor_winrate) > 0.5 ? ['Strong correlation between risk scores and performance'] : [])
        ]
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Statistical analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform statistical analysis' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

interface HandAction {
  id: number;
  hand_id: string;
  player_id: string;
  action_type: string;
  amount: number;
  street: string;
  position: string;
  pot_size_before: number;
  pot_odds: number;
  stack_size: number;
  is_all_in: boolean;
}

async function getActionsFromTurso(limit: number = 100): Promise<HandAction[]> {
  console.log(`Fetching ${limit} hand actions from Turso for detailed analysis...`);
  
  const query = `
    SELECT 
      id,
      hand_id,
      player_id,
      action_type,
      amount,
      street,
      position,
      pot_size_before,
      pot_odds,
      stack_size,
      is_all_in
    FROM hand_actions
    WHERE player_id LIKE 'CoinPoker%'
    ORDER BY id DESC
    LIMIT ?
  `;
  
  try {
    const result = await queryTurso(query, [limit]);
    console.log(`Found ${result.rows.length} hand actions for detailed analysis`);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      hand_id: row.hand_id,
      player_id: row.player_id,
      action_type: row.action_type,
      amount: row.amount || 0,
      street: row.street,
      position: row.position,
      pot_size_before: row.pot_size_before || 0,
      pot_odds: row.pot_odds || 0,
      stack_size: row.stack_size || 0,
      is_all_in: row.is_all_in === 1 || row.is_all_in === true,
    }));
  } catch (error) {
    console.error('Error fetching hand actions from Turso:', error);
    throw error;
  }
}

function analyzeActionPatterns(actions: HandAction[]) {
  // Group actions by player
  const playerActions = actions.reduce((acc, action) => {
    if (!acc[action.player_id]) {
      acc[action.player_id] = [];
    }
    acc[action.player_id].push(action);
    return acc;
  }, {} as Record<string, HandAction[]>);

  const playerAnalysis = Object.entries(playerActions).map(([playerId, actions]) => {
    // Preflop analysis
    const preflopActions = actions.filter(a => a.street === 'preflop');
    const preflopFolds = preflopActions.filter(a => a.action_type === 'fold').length;
    const preflopCalls = preflopActions.filter(a => a.action_type === 'call').length;
    const preflopRaises = preflopActions.filter(a => a.action_type === 'raise' || a.action_type === 'bet').length;
    
    const vpipActions = preflopActions.filter(a => a.action_type !== 'fold').length;
    const pfrActions = preflopActions.filter(a => a.action_type === 'raise' || a.action_type === 'bet').length;
    
    const vpip = preflopActions.length > 0 ? (vpipActions / preflopActions.length) * 100 : 0;
    const pfr = preflopActions.length > 0 ? (pfrActions / preflopActions.length) * 100 : 0;

    // Postflop analysis
    const postflopActions = actions.filter(a => ['flop', 'turn', 'river'].includes(a.street));
    const postflopBets = postflopActions.filter(a => a.action_type === 'bet' || a.action_type === 'raise').length;
    const postflopCalls = postflopActions.filter(a => a.action_type === 'call').length;
    const postflopFolds = postflopActions.filter(a => a.action_type === 'fold').length;
    
    const aggressionFactor = (postflopBets + postflopCalls > 0) ? 
      postflopBets / (postflopBets + postflopCalls) : 0;

    // Position analysis
    const positionStats = actions.reduce((acc, action) => {
      const pos = action.position || 'unknown';
      if (!acc[pos]) {
        acc[pos] = { total: 0, aggressive: 0 };
      }
      acc[pos].total++;
      if (action.action_type === 'bet' || action.action_type === 'raise') {
        acc[pos].aggressive++;
      }
      return acc;
    }, {} as Record<string, { total: number; aggressive: number }>);

    // Bet sizing analysis
    const betActions = actions.filter(a => 
      (a.action_type === 'bet' || a.action_type === 'raise') && a.amount > 0 && a.pot_size_before > 0
    );
    
    const betSizes = betActions.map(a => a.amount / a.pot_size_before);
    const avgBetSize = betSizes.length > 0 ? betSizes.reduce((sum, size) => sum + size, 0) / betSizes.length : 0;
    
    // All-in analysis
    const allInActions = actions.filter(a => a.is_all_in);
    const allInFrequency = actions.length > 0 ? (allInActions.length / actions.length) * 100 : 0;

    // Suspicious patterns detection
    const suspiciousPatterns = [];
    
    // Overly tight/loose play
    if (vpip < 10) suspiciousPatterns.push('Extremely tight play (VPIP < 10%)');
    if (vpip > 80) suspiciousPatterns.push('Extremely loose play (VPIP > 80%)');
    
    // Unusual bet sizing
    if (avgBetSize > 3) suspiciousPatterns.push('Oversized betting pattern');
    if (avgBetSize > 0 && avgBetSize < 0.3) suspiciousPatterns.push('Undersized betting pattern');
    
    // High all-in frequency
    if (allInFrequency > 10) suspiciousPatterns.push('High all-in frequency');
    
    // Perfect or very poor aggression
    if (aggressionFactor === 1 && postflopActions.length > 10) suspiciousPatterns.push('Perfect aggression (possible bot)');
    if (aggressionFactor === 0 && postflopActions.length > 10) suspiciousPatterns.push('Zero aggression');

    return {
      player_id: playerId,
      total_actions: actions.length,
      preflop_stats: {
        total_preflop_actions: preflopActions.length,
        vpip: Math.round(vpip * 10) / 10,
        pfr: Math.round(pfr * 10) / 10,
        preflop_folds: preflopFolds,
        preflop_calls: preflopCalls,
        preflop_raises: preflopRaises
      },
      postflop_stats: {
        total_postflop_actions: postflopActions.length,
        aggression_factor: Math.round(aggressionFactor * 100) / 100,
        postflop_bets: postflopBets,
        postflop_calls: postflopCalls,
        postflop_folds: postflopFolds
      },
      position_analysis: Object.entries(positionStats).map(([position, stats]) => ({
        position,
        total_actions: stats.total,
        aggressive_actions: stats.aggressive,
        aggression_rate: stats.total > 0 ? Math.round((stats.aggressive / stats.total) * 100 * 10) / 10 : 0
      })),
      bet_sizing: {
        avg_bet_to_pot_ratio: Math.round(avgBetSize * 100) / 100,
        total_bet_actions: betActions.length,
        oversized_bets: betSizes.filter(size => size > 2).length,
        undersized_bets: betSizes.filter(size => size < 0.5).length
      },
      all_in_analysis: {
        total_all_ins: allInActions.length,
        all_in_frequency: Math.round(allInFrequency * 10) / 10,
        avg_all_in_stack_size: allInActions.length > 0 ? 
          Math.round(allInActions.reduce((sum, a) => sum + a.stack_size, 0) / allInActions.length) : 0
      },
      suspicious_patterns: suspiciousPatterns,
      risk_score: Math.min(100, suspiciousPatterns.length * 25) // 25 points per suspicious pattern
    };
  });

  return playerAnalysis;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player_id');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const street = searchParams.get('street'); // preflop, flop, turn, river
    
    // Get hand actions from Turso
    let actions = await getActionsFromTurso(limit);
    
    if (actions.length === 0) {
      return NextResponse.json({
        error: 'No hand actions found',
        detailed_analysis: [],
        timestamp: new Date().toISOString()
      });
    }

    // Filter by player if specified
    if (playerId) {
      actions = actions.filter(action => 
        action.player_id.toLowerCase().includes(playerId.toLowerCase())
      );
      
      if (actions.length === 0) {
        return NextResponse.json({
          error: `No actions found for player ${playerId}`,
          detailed_analysis: [],
          timestamp: new Date().toISOString()
        });
      }
    }

    // Filter by street if specified
    if (street) {
      actions = actions.filter(action => action.street === street.toLowerCase());
    }

    // Analyze action patterns
    const detailedAnalysis = analyzeActionPatterns(actions);

    // Calculate population statistics
    const populationStats = {
      total_players_analyzed: detailedAnalysis.length,
      total_actions_analyzed: actions.length,
      avg_vpip: Math.round(detailedAnalysis.reduce((sum, p) => sum + p.preflop_stats.vpip, 0) / detailedAnalysis.length * 10) / 10,
      avg_pfr: Math.round(detailedAnalysis.reduce((sum, p) => sum + p.preflop_stats.pfr, 0) / detailedAnalysis.length * 10) / 10,
      avg_aggression: Math.round(detailedAnalysis.reduce((sum, p) => sum + p.postflop_stats.aggression_factor, 0) / detailedAnalysis.length * 100) / 100,
      suspicious_players: detailedAnalysis.filter(p => p.suspicious_patterns.length > 0).length,
      high_risk_players: detailedAnalysis.filter(p => p.risk_score >= 50).length
    };

    // Street distribution
    const streetDistribution = {
      preflop: actions.filter(a => a.street === 'preflop').length,
      flop: actions.filter(a => a.street === 'flop').length,
      turn: actions.filter(a => a.street === 'turn').length,
      river: actions.filter(a => a.street === 'river').length
    };

    // Action type distribution
    const actionDistribution = actions.reduce((acc, action) => {
      acc[action.action_type] = (acc[action.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      detailed_analysis: detailedAnalysis,
      population_statistics: populationStats,
      street_distribution: streetDistribution,
      action_distribution: actionDistribution,
      analysis_parameters: {
        total_actions_processed: actions.length,
        player_filter: playerId || 'all',
        street_filter: street || 'all',
        limit_applied: limit
      },
      methodology: {
        vpip_calculation: "Percentage of hands where player voluntarily put money in pot preflop",
        pfr_calculation: "Percentage of hands where player raised preflop",
        aggression_factor: "Ratio of bets/raises to calls postflop",
        risk_scoring: "Based on number and severity of suspicious patterns detected"
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Detailed action analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform detailed action analysis' },
      { status: 500 }
    );
  }
} 
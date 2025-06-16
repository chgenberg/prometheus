import { NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

interface TableSession {
  session_id: string;
  game_type: string;
  table_size: number;
  session_start: string;
  session_end: string;
  total_hands: number;
  net_result: number;
  players_at_table: PlayerAtTable[];
  suspicious_patterns: string[];
  bot_risk_score: number;
}

interface PlayerAtTable {
  player_name: string;
  hands_played: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  aggression_factor: number;
  ai_score: number;
  bot_risk: number;
  suspicious_actions: string[];
  timing_patterns: {
    avg_decision_time: number;
    consistency_score: number;
    unusual_timing: boolean;
  };
}

// Calculate bot risk based on multiple factors
function calculateTableBotRisk(player: any, tableContext: any): number {
  let riskScore = 0;
  const suspiciousActions: string[] = [];

  // 1. Consistent play patterns (too perfect)
  if (player.decision_consistency > 95) {
    riskScore += 25;
    suspiciousActions.push('Extremely consistent decisions');
  }

  // 2. Unusual timing patterns
  if (player.avg_decision_time < 0.5 || player.timing_variance < 0.1) {
    riskScore += 20;
    suspiciousActions.push('Robotic timing patterns');
  }

  // 3. Optimal play in complex situations
  if (player.postflop_score > 90 && player.hands_played > 100) {
    riskScore += 15;
    suspiciousActions.push('Near-perfect postflop play');
  }

  // 4. Lack of emotional variance
  if (player.tilt_resistance > 98) {
    riskScore += 10;
    suspiciousActions.push('No emotional variance detected');
  }

  // 5. Multi-table synchronization (if detected)
  if (tableContext.simultaneous_actions > 3) {
    riskScore += 30;
    suspiciousActions.push('Synchronized multi-table actions');
  }

  return {
    risk: Math.min(100, riskScore),
    actions: suspiciousActions
  };
}

// Analyze table dynamics for collusion
function analyzeTableCollusion(players: any[]): string[] {
  const collusionPatterns: string[] = [];
  
  // Check for soft play patterns
  const lowAggressionPairs = players.filter(p => 
    players.some(other => 
      other.player_name !== p.player_name && 
      Math.abs(p.aggression_vs_specific - other.aggression_vs_specific) > 2
    )
  );
  
  if (lowAggressionPairs.length > 0) {
    collusionPatterns.push('Potential soft-play detected between specific players');
  }

  // Check for coordinated betting patterns
  const similarTimingPlayers = players.filter(p => 
    players.some(other => 
      other.player_name !== p.player_name && 
      Math.abs(p.avg_decision_time - other.avg_decision_time) < 0.2
    )
  );

  if (similarTimingPlayers.length > 2) {
    collusionPatterns.push('Synchronized timing patterns suggest coordination');
  }

  return collusionPatterns;
}

export async function GET(
  request: Request,
  { params }: { params: { playerName: string } }
) {
  try {
    const { playerName } = params;
    const decodedPlayerName = decodeURIComponent(playerName);
    
    console.log(`Fetching table sessions for player: ${decodedPlayerName}`);
    
    const db = await openDb();
    
    // Get all hands/sessions for this player with table information
    const playerSessions = await db.all(`
      SELECT DISTINCT
        substr(hh_id, 1, 8) as session_id,
        table_size,
        COUNT(*) as total_hands,
        MIN(created_at) as session_start,
        MAX(created_at) as session_end,
        'CashGame' as game_type
      FROM detailed_actions 
      WHERE player_name = ?
      GROUP BY substr(hh_id, 1, 8), table_size
      HAVING total_hands >= 10
      ORDER BY session_start DESC
      LIMIT 20
    `, [decodedPlayerName]);

    console.log(`Found ${playerSessions.length} sessions for ${decodedPlayerName}`);

    // For each session, get all players at the table
    const enrichedSessions: TableSession[] = [];
    
    for (const session of playerSessions) {
      // Get all players in this session
      const playersInSession = await db.all(`
        SELECT 
          da.player_name,
          COUNT(da.hh_id) as hands_played,
          AVG(CASE WHEN da.amount > 0 THEN da.amount ELSE 0 END) as avg_bet_size,
          m.preflop_vpip as vpip,
          m.preflop_pfr as pfr,
          m.postflop_aggression as aggression_factor,
          m.avg_postflop_score as ai_score,
          m.intention_score,
          m.collusion_score,
          m.bad_actor_score,
          AVG(da.score) as avg_action_score
        FROM detailed_actions da
        LEFT JOIN main m ON da.player_name = m.player_name
        WHERE substr(da.hh_id, 1, 8) = ?
        GROUP BY da.player_name
        HAVING hands_played >= 5
      `, [session.session_id]);

      // Calculate net result for the main player in this session
      const playerResult = await db.get(`
        SELECT 
          SUM(amount) as net_result,
          COUNT(*) as actions_count,
          AVG(amount) as avg_action_amount
        FROM detailed_actions 
        WHERE player_name = ? AND substr(hh_id, 1, 8) = ?
      `, [decodedPlayerName, session.session_id]);

      // Analyze each player at the table
      const analyzedPlayers: PlayerAtTable[] = playersInSession.map(player => {
        const botAnalysis = calculateTableBotRisk(player, {
          simultaneous_actions: Math.floor(Math.random() * 5), // Mock data - would be calculated from real timing data
        });

        return {
          player_name: player.player_name,
          hands_played: player.hands_played,
          net_win_bb: Math.round((player.avg_bet_size * player.hands_played) / 100) / 100,
          vpip: player.vpip || 0,
          pfr: player.pfr || 0,
          aggression_factor: player.aggression_factor || 0,
          ai_score: player.ai_score || 50,
          bot_risk: botAnalysis.risk,
          suspicious_actions: botAnalysis.actions,
          timing_patterns: {
            avg_decision_time: Math.random() * 3 + 1, // Mock timing data
            consistency_score: Math.random() * 100,
            unusual_timing: botAnalysis.risk > 50
          }
        };
      });

      // Analyze table for collusion
      const collusionPatterns = analyzeTableCollusion(analyzedPlayers);
      
      // Calculate overall table bot risk
      const avgBotRisk = analyzedPlayers.reduce((sum, p) => sum + p.bot_risk, 0) / analyzedPlayers.length;
      const highRiskPlayers = analyzedPlayers.filter(p => p.bot_risk > 60).length;
      
      let tableBotRisk = avgBotRisk;
      if (highRiskPlayers > 1) tableBotRisk += 20; // Multiple bots at same table
      if (collusionPatterns.length > 0) tableBotRisk += 15; // Collusion detected
      
      const suspiciousPatterns: string[] = [];
      if (highRiskPlayers > 1) suspiciousPatterns.push(`${highRiskPlayers} high-risk bots detected`);
      if (avgBotRisk > 40) suspiciousPatterns.push('Above-average bot activity at table');
      suspiciousPatterns.push(...collusionPatterns);

      enrichedSessions.push({
        session_id: session.session_id,
        game_type: `${session.game_type} ${session.table_size}-max`,
        table_size: session.table_size,
        session_start: session.session_start,
        session_end: session.session_end,
        total_hands: session.total_hands,
        net_result: playerResult?.net_result || 0,
        players_at_table: analyzedPlayers,
        suspicious_patterns: suspiciousPatterns,
        bot_risk_score: Math.min(100, tableBotRisk)
      });
    }

    // Sort by bot risk (most suspicious first)
    enrichedSessions.sort((a, b) => b.bot_risk_score - a.bot_risk_score);

    console.log(`Analyzed ${enrichedSessions.length} table sessions`);

    return NextResponse.json({
      success: true,
      player: decodedPlayerName,
      sessions: enrichedSessions,
      totalSessions: enrichedSessions.length,
      averageBotRisk: enrichedSessions.reduce((sum, s) => sum + s.bot_risk_score, 0) / enrichedSessions.length
    });

  } catch (error) {
    console.error('Table sessions analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze table sessions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
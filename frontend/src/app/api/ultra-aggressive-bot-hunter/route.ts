import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

// 🔥 ULTRA-AGGRESSIVE BOT HUNTER
// Sänkta trösklar för att fånga ALLA potentiella botar

interface SuspiciousPlayer {
  player_id: string;
  suspicion_level: number; // 0-100
  red_flags: string[];
  behavioral_anomalies: {
    // Micro-patterns som avslöjar botar
    bet_size_clustering: number;
    session_regularity: number; 
    action_timing_uniformity: number;
    multi_table_correlation: number;
    profit_consistency: number;
  };
  human_likelihood: number; // 0-100, där 100 = definitivt människa
}

export async function GET() {
  try {
    const db = await openDb();
    console.log('🔥 ULTRA-AGGRESSIVE BOT HUNTER startar...');

    // Analysera ALLA spelare med mer än 50 händer
    const allPlayers = await db.all(`
      SELECT player_id, 
             COUNT(*) as total_actions,
             COUNT(DISTINCT hand_id) as unique_hands
      FROM detailed_actions 
      GROUP BY player_id 
      HAVING COUNT(*) > 50
      ORDER BY COUNT(*) DESC
    `);

    console.log(`🎯 Analyserar ${allPlayers.length} spelare...`);

    const suspiciousPlayers: SuspiciousPlayer[] = [];

    for (const player of allPlayers) {
      const playerId = player.player_id;
      let suspicionLevel = 0;
      const redFlags: string[] = [];
      
      // Initialize variables to avoid scope issues
      let gtoClusterCount = 0;
      let stdDev = 0;
      let avgDuration = 0;
      let actionsPerMinute = 0;
      let winPercentage = 0.5;

      // === BET-SIZE CLUSTERING ANALYSIS ===
      const betSizes = await db.all(`
        SELECT amount, pot_before,
               CASE WHEN pot_before > 0 THEN (amount * 100.0 / pot_before) ELSE 0 END as pot_pct
        FROM detailed_actions 
        WHERE player_id = ? AND amount > 0 AND pot_before > 0
        LIMIT 1000
      `, [playerId]);

      if (betSizes.length > 20) {
        // Räkna kluster runt vanliga GTO-storleker
        const gtoSizes = [25, 33, 50, 66, 75, 100, 150]; // Vanliga pot-procent
        let gtoClusterCount = 0;
        
        betSizes.forEach((bet: any) => {
          gtoSizes.forEach(gtoSize => {
            if (Math.abs(bet.pot_pct - gtoSize) < 3) { // ±3% tolerans
              gtoClusterCount++;
            }
          });
        });

        const gtoRatio = gtoClusterCount / betSizes.length;
        if (gtoRatio > 0.25) { // Sänkt från 0.4
          redFlags.push(`GTO-kluster: ${(gtoRatio * 100).toFixed(1)}%`);
          suspicionLevel += Math.min(40, gtoRatio * 80);
        }

        // Kolla efter exakt samma bet-storlekar (bot-pattern)
        const exactCounts: Record<number, number> = {};
        betSizes.forEach((bet: any) => {
          const rounded = Math.round(bet.amount / 100) * 100; // Runda till närmaste 100
          exactCounts[rounded] = (exactCounts[rounded] || 0) + 1;
        });

        const maxRepeats = Math.max(...Object.values(exactCounts));
        if (maxRepeats > betSizes.length * 0.15) { // Om >15% är samma storlek
          redFlags.push(`Repetitiv bet-size: ${maxRepeats}/${betSizes.length}`);
          suspicionLevel += 25;
        }
      }

      // === SESSION TIMING ANALYSIS ===
      const sessions = await db.all(`
        SELECT duration_minutes, hands_played
        FROM session_analysis 
        WHERE player_id = ?
        ORDER BY session_start DESC
        LIMIT 20
      `, [playerId]);

      if (sessions.length > 5) {
        // Kolla om session-längder är för regelbundna
        const durations = sessions.map((s: any) => s.duration_minutes);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const variance = durations.reduce((a, b) => a + Math.pow(b - avgDuration, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        const cv = avgDuration > 0 ? stdDev / avgDuration : 1;

        if (cv < 0.2) { // Mycket låg variation = bot-liknande
          redFlags.push(`Regelbundna sessioner (CV: ${cv.toFixed(2)})`);
          suspicionLevel += 30;
        }

        // Marathon-session flagg (sänkt tröska)
        const maxSession = Math.max(...durations);
        if (maxSession > 600) { // Sänkt från 960 till 600 min (10h)
          redFlags.push(`Marathon-session: ${maxSession} min`);
          suspicionLevel += 20;
        }
      }

      // === ACTION FREQUENCY ANALYSIS ===
      // Räkna actions per minut i genomsnitt
      const totalSessionTime = sessions.reduce((a: any, b: any) => a + b.duration_minutes, 0);
      if (totalSessionTime > 0) {
        const actionsPerMinute = player.total_actions / totalSessionTime;
        
        // Botar tenderar att ha mycket regelbunden action-rate
        if (actionsPerMinute > 5) { // Mycket hög action-rate
          redFlags.push(`Hög action-rate: ${actionsPerMinute.toFixed(1)}/min`);
          suspicionLevel += 15;
        }
      }

      // === PROFIT CONSISTENCY ===
      const winRateData = await db.all(`
        SELECT net_win 
        FROM detailed_actions 
        WHERE player_id = ? AND net_win != 0
        LIMIT 500
      `, [playerId]);

      if (winRateData.length > 50) {
        const winRates = winRateData.map((w: any) => w.net_win);
        const positiveWins = winRates.filter(w => w > 0).length;
        const winPercentage = positiveWins / winRates.length;

        // Botar har ofta för konsekvent vinst/förlust-mönster
        if (winPercentage > 0.65 || winPercentage < 0.35) {
          redFlags.push(`Extremt vinst-mönster: ${(winPercentage * 100).toFixed(1)}%`);
          suspicionLevel += 20;
        }
      }

      // === MULTI-TABLING INDICATORS ===
      if (sessions.length > 50) { // Många sessioner = potentiell multi-tabler
        redFlags.push(`Extrem volym: ${sessions.length} sessioner`);
        suspicionLevel += 15;
      }

      // === BERÄKNA HUMAN LIKELIHOOD ===
      const humanLikelihood = Math.max(0, 100 - suspicionLevel);

      // Lägg till i listan om suspicion > 20 (mycket aggressiv)
      if (suspicionLevel > 20 || redFlags.length > 2) {
        suspiciousPlayers.push({
          player_id: playerId,
          suspicion_level: Math.min(100, suspicionLevel),
          red_flags: redFlags,
          behavioral_anomalies: {
            bet_size_clustering: betSizes.length > 0 ? (gtoClusterCount / betSizes.length) * 100 : 0,
            session_regularity: sessions.length > 0 ? (1 - (stdDev / avgDuration)) * 100 : 0,
            action_timing_uniformity: actionsPerMinute || 0,
            multi_table_correlation: sessions.length,
            profit_consistency: winRateData.length > 0 ? Math.abs(winPercentage - 0.5) * 200 : 0
          },
          human_likelihood: humanLikelihood
        });
      }
    }

    // Sortera efter suspicion level
    suspiciousPlayers.sort((a, b) => b.suspicion_level - a.suspicion_level);

    console.log(`🚨 Flaggade ${suspiciousPlayers.length} misstänkta konton av ${allPlayers.length}`);

    const highRiskCount = suspiciousPlayers.filter(p => p.suspicion_level > 60).length;
    const mediumRiskCount = suspiciousPlayers.filter(p => p.suspicion_level > 40 && p.suspicion_level <= 60).length;

    return NextResponse.json({
      success: true,
      analysis_type: 'ULTRA_AGGRESSIVE_DETECTION',
      timestamp: new Date().toISOString(),
      total_players_analyzed: allPlayers.length,
      suspicious_players_found: suspiciousPlayers.length,
      risk_breakdown: {
        high_risk: highRiskCount,
        medium_risk: mediumRiskCount,
        low_risk: suspiciousPlayers.length - highRiskCount - mediumRiskCount
      },
      detection_rate: `${((suspiciousPlayers.length / allPlayers.length) * 100).toFixed(1)}%`,
      top_suspects: suspiciousPlayers.slice(0, 20),
      summary_stats: {
        avg_suspicion: suspiciousPlayers.reduce((a, b) => a + b.suspicion_level, 0) / suspiciousPlayers.length,
        most_common_flags: getMostCommonFlags(suspiciousPlayers),
        threat_assessment: getThreatAssessment(suspiciousPlayers)
      }
    });

  } catch (error) {
    console.error('🔥 Ultra-aggressive detection error:', error);
    return NextResponse.json(
      { error: 'Ultra-aggressive detection failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

function getMostCommonFlags(players: SuspiciousPlayer[]): Record<string, number> {
  const flagCounts: Record<string, number> = {};
  players.forEach(player => {
    player.red_flags.forEach(flag => {
      const flagType = flag.split(':')[0]; // Ta första delen före ':'
      flagCounts[flagType] = (flagCounts[flagType] || 0) + 1;
    });
  });
  return flagCounts;
}

function getThreatAssessment(players: SuspiciousPlayer[]): string {
  const highRisk = players.filter(p => p.suspicion_level > 70).length;
  const totalPlayers = players.length;
  
  if (highRisk > 10) return 'CRITICAL_INFESTATION';
  if (highRisk > 5) return 'SIGNIFICANT_THREAT';
  if (totalPlayers > 20) return 'MODERATE_RISK';
  if (totalPlayers > 5) return 'LOW_RISK';
  return 'MINIMAL_THREAT';
} 
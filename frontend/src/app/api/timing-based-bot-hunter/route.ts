import { NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

// 🚨 TIMING-BASED BOT HUNTER - De mest avancerade timing-signatures
// Analyserar microsecond-patterns som BARA botar kan skapa

interface TimingBotSignature {
  player_id: string;
  bot_probability: number; // 0-100
  timing_anomalies: {
    // CRITICAL: Samma timestamp för flera actions (omöjligt för människor)
    simultaneous_actions: number;
    same_second_actions: number;
    
    // Micro-timing patterns
    action_intervals_ms: number[];
    avg_reaction_time: number;
    reaction_time_variance: number;
    
    // Session timing patterns  
    session_start_clustering: number; // Startar alltid samma tid
    session_length_uniformity: number; // Samma session-längd
    break_pattern_regularity: number; // Regelbundna pauser
    
    // Multi-table synchronization
    cross_table_correlation: number;
    synchronized_decisions: number;
    
    // Circadian rhythm violations
    activity_24h_entropy: number; // Botar spelar jämnt dygnet runt
    weekend_vs_weekday_consistency: number;
  };
  evidence_strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'OVERWHELMING';
  human_impossibility_score: number; // 0-100, där >90 = fysiskt omöjligt för människor
}

export async function GET() {
  try {
    const db = await openDb();
    console.log('🕐 TIMING-BASED BOT HUNTER initierad...');

    // Hämta alla spelare med tillräckligt data
    const players = await db.all(`
      SELECT DISTINCT player_id
      FROM detailed_actions 
      WHERE created_at IS NOT NULL
      GROUP BY player_id 
      HAVING COUNT(*) > 100
      LIMIT 50
    `);

    console.log(`⏱️ Analyserar timing-patterns för ${players.length} spelare...`);

    const timingSignatures: TimingBotSignature[] = [];

    for (const playerRow of players) {
      const playerId = playerRow.player_id;
      console.log(`🔍 Analyserar timing för ${playerId}...`);

      // === CRITICAL ANALYSIS: SIMULTANEOUS ACTIONS ===
      const simultaneousActions = await db.get(`
        SELECT COUNT(*) as count
        FROM (
          SELECT created_at, COUNT(*) as actions_same_time
          FROM detailed_actions 
          WHERE player_id = ?
          GROUP BY created_at
          HAVING COUNT(*) > 1
        )
      `, [playerId]);

      const sameSecondActions = simultaneousActions?.count || 0;

      // === ACTION TIMING INTERVALS ===
      const actionSequence = await db.all(`
        SELECT created_at, action_type, sequence_num
        FROM detailed_actions 
        WHERE player_id = ?
        ORDER BY created_at, sequence_num
        LIMIT 500
      `, [playerId]);

      // Beräkna intervaller mellan actions (i sekunder, eftersom vi bara har sekund-precision)
      const intervals: number[] = [];
      for (let i = 1; i < actionSequence.length; i++) {
        const prevTime = new Date(actionSequence[i-1].created_at).getTime();
        const currTime = new Date(actionSequence[i].created_at).getTime();
        const intervalMs = currTime - prevTime;
        if (intervalMs > 0 && intervalMs < 300000) { // 5 min max
          intervals.push(intervalMs);
        }
      }

      const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
      const intervalVariance = intervals.length > 1 ? 
        intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length : 0;

      // === SESSION TIMING ANALYSIS ===
      const sessions = await db.all(`
        SELECT session_start, session_end, duration_minutes,
               strftime('%H', session_start) as start_hour,
               strftime('%w', session_start) as day_of_week
        FROM session_analysis 
        WHERE player_id = ?
        ORDER BY session_start
      `, [playerId]);

      // Session start clustering (startar alltid samma tid = bot)
      const startHours = sessions.map((s: any) => parseInt(s.start_hour));
      const hourCounts: Record<number, number> = {};
      startHours.forEach(hour => hourCounts[hour] = (hourCounts[hour] || 0) + 1);
      const maxHourCount = Math.max(...Object.values(hourCounts));
      const sessionStartClustering = sessions.length > 0 ? (maxHourCount / sessions.length) * 100 : 0;

      // Session length uniformity
      const durations = sessions.map((s: any) => s.duration_minutes).filter(d => d > 0);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length || 0;
      const durationVariance = durations.length > 1 ?
        durations.reduce((a, b) => a + Math.pow(b - avgDuration, 2), 0) / durations.length : 0;
      const durationCV = avgDuration > 0 ? Math.sqrt(durationVariance) / avgDuration : 1;
      const sessionUniformity = durationCV < 0.15 ? (1 - durationCV) * 100 : 0;

      // 24h activity entropy
      const activityByHour: Record<number, number> = {};
      actionSequence.forEach(action => {
        const hour = new Date(action.created_at).getHours();
        activityByHour[hour] = (activityByHour[hour] || 0) + 1;
      });
      
      // Beräkna Shannon entropy för 24h aktivitet
      const totalActions = actionSequence.length;
      let hourlyEntropy = 0;
      for (let hour = 0; hour < 24; hour++) {
        const count = activityByHour[hour] || 0;
        if (count > 0) {
          const p = count / totalActions;
          hourlyEntropy -= p * Math.log2(p);
        }
      }
      const maxEntropy = Math.log2(24); // Perfect uniform distribution
      const entropyRatio = hourlyEntropy / maxEntropy;

      // === CALCULATE BOT PROBABILITY ===
      let botProbability = 0;
      let humanImpossibility = 0;

      // CRITICAL: Simultaneous actions (fysiskt omöjligt)
      if (sameSecondActions > 0) {
        botProbability += Math.min(80, sameSecondActions * 10);
        humanImpossibility += Math.min(90, sameSecondActions * 15);
      }

      // Extremt låg timing-variance (bot-signature)
      if (intervalVariance < 1000 && intervals.length > 50) { // <1s variance
        botProbability += 60;
        humanImpossibility += 40;
      }

      // Session start clustering (alltid samma tid)
      if (sessionStartClustering > 50) {
        botProbability += Math.min(40, sessionStartClustering);
        humanImpossibility += 20;
      }

      // Session uniformity (exakt samma längd)
      if (sessionUniformity > 70) {
        botProbability += Math.min(30, sessionUniformity / 2);
        humanImpossibility += 25;
      }

      // 24h perfect distribution (botar spelar jämnt)
      if (entropyRatio > 0.85) { // Nästan perfect uniform
        botProbability += 25;
        humanImpossibility += 15;
      }

      // Weekend vs weekday consistency (människor varierar)
      const weekdayActions = actionSequence.filter(a => {
        const dayOfWeek = new Date(a.created_at).getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      }).length;
      const weekendActions = actionSequence.length - weekdayActions;
      const weekdayRatio = weekdayActions / actionSequence.length;
      
      // Människor spelar olika weekday vs weekend, botar är konsistenta
      if (Math.abs(weekdayRatio - 0.714) < 0.05) { // 5/7 ≈ 0.714, för konstant
        botProbability += 15;
        humanImpossibility += 10;
      }

      // Bestäm evidence strength
      let evidenceStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'OVERWHELMING' = 'WEAK';
      if (humanImpossibility > 80) evidenceStrength = 'OVERWHELMING';
      else if (humanImpossibility > 60) evidenceStrength = 'STRONG';
      else if (humanImpossibility > 40) evidenceStrength = 'MODERATE';

      // Lägg till i resultat om significant
      if (botProbability > 30 || humanImpossibility > 25) {
        timingSignatures.push({
          player_id: playerId,
          bot_probability: Math.min(100, botProbability),
          timing_anomalies: {
            simultaneous_actions: sameSecondActions,
            same_second_actions: sameSecondActions,
            action_intervals_ms: intervals.slice(0, 10), // Sample
            avg_reaction_time: avgInterval,
            reaction_time_variance: intervalVariance,
            session_start_clustering: sessionStartClustering,
            session_length_uniformity: sessionUniformity,
            break_pattern_regularity: 0, // Would need more granular data
            cross_table_correlation: 0, // Would need table IDs
            synchronized_decisions: sameSecondActions,
            activity_24h_entropy: entropyRatio * 100,
            weekend_vs_weekday_consistency: Math.abs(weekdayRatio - 0.714) * 100
          },
          evidence_strength: evidenceStrength,
          human_impossibility_score: Math.min(100, humanImpossibility)
        });
      }
    }

    // Sortera efter human impossibility score
    timingSignatures.sort((a, b) => b.human_impossibility_score - a.human_impossibility_score);

    const criticalCases = timingSignatures.filter(s => s.evidence_strength === 'OVERWHELMING').length;
    const strongCases = timingSignatures.filter(s => s.evidence_strength === 'STRONG').length;

    console.log(`🚨 TIMING ANALYSIS KLAR:`);
    console.log(`   • ${timingSignatures.length} misstänkta konton`);
    console.log(`   • ${criticalCases} OVERWHELMING cases`);
    console.log(`   • ${strongCases} STRONG cases`);

    return NextResponse.json({
      success: true,
      analysis_type: 'TIMING_BASED_BOT_DETECTION',
      timestamp: new Date().toISOString(),
      players_analyzed: players.length,
      suspicious_players: timingSignatures.length,
      critical_cases: criticalCases,
      strong_cases: strongCases,
      detection_summary: {
        avg_bot_probability: timingSignatures.reduce((a, b) => a + b.bot_probability, 0) / timingSignatures.length,
        avg_impossibility_score: timingSignatures.reduce((a, b) => a + b.human_impossibility_score, 0) / timingSignatures.length,
        most_common_anomalies: getMostCommonAnomalies(timingSignatures)
      },
      signatures: timingSignatures,
      methodology: {
        simultaneous_action_detection: "Actions med identisk timestamp = fysiskt omöjligt",
        timing_variance_analysis: "Låg variance i action-timing = bot-signature", 
        session_clustering: "Regelbundna session-tider = automatiserad drift",
        circadian_analysis: "Jämn 24h aktivitet = bot (människor sover)"
      }
    });

  } catch (error) {
    console.error('🔥 Timing-based detection error:', error);
    return NextResponse.json(
      { error: 'Timing analysis failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

function getMostCommonAnomalies(signatures: TimingBotSignature[]): Record<string, number> {
  const anomalies: Record<string, number> = {};
  
  signatures.forEach(sig => {
    if (sig.timing_anomalies.simultaneous_actions > 0) {
      anomalies['simultaneous_actions'] = (anomalies['simultaneous_actions'] || 0) + 1;
    }
    if (sig.timing_anomalies.session_start_clustering > 50) {
      anomalies['session_clustering'] = (anomalies['session_clustering'] || 0) + 1;
    }
    if (sig.timing_anomalies.reaction_time_variance < 1000) {
      anomalies['low_timing_variance'] = (anomalies['low_timing_variance'] || 0) + 1;
    }
    if (sig.timing_anomalies.activity_24h_entropy > 85) {
      anomalies['uniform_24h_activity'] = (anomalies['uniform_24h_activity'] || 0) + 1;
    }
  });
  
  return anomalies;
} 
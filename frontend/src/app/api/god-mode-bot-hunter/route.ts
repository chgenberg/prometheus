import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';
import OpenAI from 'openai';

// 🔱 PROMETHEUS GOD MODE - UNLEASH FULL POWER
// Analyzes ALL players. Maximum aggression algorithm. GPT-4o for all ambiguous cases.

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GodModeProfile {
  player_id: string;
  threat_level: 'NO_THREAT' | 'LOW_RISK' | 'SUSPICIOUS' | 'HIGH_RISK' | 'CRITICAL_BOT';
  final_score: number;
  factors: {
    timing: number;
    emotion: number;
    consistency: number;
    circadian: number;
  };
  gpt4o_verdict?: any;
}

async function getOpenAIVerdict(playerData: any): Promise<any> {
  const prompt = `
    Analyze the following poker player data for bot-like activity. Provide a concise, expert opinion. Respond ONLY with a JSON object.

    Data:
    - Player: ${playerData.player_id}
    - Timing Impossibility (physical impossibility of action timing): ${playerData.timing}%
    - Emotional Control (100% = never tilts like a human): ${playerData.emotion}%
    - AI-like Consistency (gameplay matches optimal AI): ${playerData.consistency}%
    - Circadian Disruption (plays at inhuman times): ${playerData.circadian}%
    - VPIP/PFR: ${playerData.vpip || 'N/A'}% / ${playerData.pfr || 'N/A'}%
    
    Based on this, provide a JSON response with: "judgement" ('BOT', 'HUMAN', 'UNCERTAIN'), "reasoning" (max 15 words), and "confidence" (0-100).
  `;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error(`OpenAI error for ${playerData.player_id}:`, error);
    return { judgement: 'API_ERROR', reasoning: 'Failed to get verdict.', confidence: 0 };
  }
}

export async function GET() {
  try {
    const db = await openDb();
    console.log('🔱 GOD MODE ENGAGED. ANALYZING ALL PLAYERS...');

    // CORRECTED QUERY: REMOVED bad join, gets aggression factor from player_stats (p)
    const players = await db.all(`
      SELECT 
        p.player_id, 
        p.vpip, 
        p.pfr
      FROM player_stats p
      WHERE p.total_hands > 100
    `);

    const profiles: GodModeProfile[] = [];
    let gpt4oConsultations = 0;

    for (const player of players) {
      const factors = {
        timing: 0,
        emotion: 0,
        consistency: 0,
        circadian: 0
      };

      // 1. Timing Impossibility
      const timing = await db.get(`SELECT COUNT(*) as c FROM (SELECT 1 FROM detailed_actions WHERE player_id = ? GROUP BY created_at HAVING COUNT(*) > 1)`, [player.player_id]);
      factors.timing = Math.min(100, (timing?.c || 0) * 5);

      // 2. Emotional Control
      const tilt = await db.get(`SELECT COUNT(*) as c FROM tilt_events WHERE player_id = ?`, [player.player_id]);
      factors.emotion = (tilt?.c === 0) ? 95 : 0;

      // 3. AI Consistency
      const ai = await db.get(`SELECT avg_preflop_score as pre, avg_postflop_score as post FROM ai_scores WHERE player = ?`, [player.player_id]);
      factors.consistency = ai ? ((ai.pre + ai.post) / 2) * 100 : 50;
      
      // 4. Circadian Rhythm
      const optimal = await db.get(`SELECT data_confidence as dc FROM optimal_play_times WHERE player_id = ?`, [player.player_id]);
      factors.circadian = optimal ? (100 - optimal.dc) : 50;

      // Aggressive Scoring Algorithm
      const final_score = 
        (factors.timing * 0.50) +      // Heaviest weight
        (factors.emotion * 0.25) +     // Second heaviest
        (factors.consistency * 0.15) +
        (factors.circadian * 0.10);

      const profile: GodModeProfile = {
        player_id: player.player_id,
        final_score,
        factors,
        threat_level: 'LOW_RISK' // Default
      };

      if (final_score > 90) profile.threat_level = 'CRITICAL_BOT';
      else if (final_score > 75) profile.threat_level = 'HIGH_RISK';
      else if (final_score > 50) profile.threat_level = 'SUSPICIOUS';
      else if (final_score > 25) profile.threat_level = 'LOW_RISK';
      else profile.threat_level = 'NO_THREAT';
      
      // GPT-4o Consultation for any non-obvious cases
      if (final_score > 25 && final_score < 90) {
        gpt4oConsultations++;
        profile.gpt4o_verdict = await getOpenAIVerdict({ ...player, ...factors });
        if (profile.gpt4o_verdict?.judgement === 'BOT' && profile.threat_level !== 'HIGH_RISK') {
            profile.threat_level = 'HIGH_RISK'; // Escalate based on AI
        }
      }
      
      profiles.push(profile);
    }
    
    profiles.sort((a, b) => b.final_score - a.final_score);

    const summary = {
        total_players_analyzed: profiles.length,
        gpt4o_consultations: gpt4oConsultations,
        critical_bots: profiles.filter(p => p.threat_level === 'CRITICAL_BOT').length,
        high_risk: profiles.filter(p => p.threat_level === 'HIGH_RISK').length,
        suspicious: profiles.filter(p => p.threat_level === 'SUSPICIOUS').length,
        low_risk: profiles.filter(p => p.threat_level === 'LOW_RISK').length,
        no_threat: profiles.filter(p => p.threat_level === 'NO_THREAT').length,
    }

    return NextResponse.json({
      analysis_type: "PROMETHEUS_GOD_MODE",
      summary,
      results: profiles
    });

  } catch (error) {
    console.error("GOD MODE FAILED:", error);
    return NextResponse.json({ error: 'God Mode analysis failed', details: error instanceof Error ? error.message : 'Unknown'}, { status: 500 });
  }
} 
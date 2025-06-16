import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';
import OpenAI from 'openai';

// 🧠 SYNERGISTIC BOT HUNTER - THE ULTIMATE DETECTOR
// Kombinerar Timing, Tilt, AI Scores & Spelmönster.
// Använder GPT-4o för att analysera tveksamma fall.

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SynergisticBotProfile {
  player_id: string;
  synergistic_score: number; // 0-100, kombinerad bot-sannolikhet
  
  // Bidragande faktorer
  contributing_factors: {
    timing_impossibility: number;     // Från TimingBotHunter
    emotional_control_score: number;  // Från Tilt-analys (hög score = bot)
    ai_consistency_score: number;     // Från AI-scores (hög score = bot)
    circadian_rhythm_score: number;   // Från optimal play times (hög score = bot)
    variance_stability_score: number; // Från variance windows
  };

  // Human-vs-Bot Klassificering
  classification: 'HUMAN' | 'BOT' | 'UNCERTAIN';
  evidence_strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'CONCLUSIVE';
  
  // GPT-4o Analys för tveksamma fall
  openai_verdict?: {
    judgement: 'LIKELY_BOT' | 'LIKELY_HUMAN' | 'INCONCLUSIVE';
    reasoning: string;
    confidence: number;
  };
}

async function getOpenAIVerdict(playerData: any): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API-nyckel saknas.");
    return { judgement: 'INCONCLUSIVE', reasoning: 'OpenAI API key not provided.', confidence: 0 };
  }

  const prompt = `
    Baserat på följande pokerdata, agera som en världsledande säkerhetsexpert specialiserad på att upptäcka botar.
    Analysera om spelaren är en bot eller en människa. Svara ENDAST med JSON.

    Spelardata:
    - Player ID: ${playerData.player_id}
    - Timing Impossibility Score: ${playerData.timing_impossibility}% (Hur omöjligt är timing-mönstret för en människa?)
    - Emotional Control Score: ${playerData.emotional_control_score}% (Hur troligt är det att en spelare aldrig tiltar? 100% = helt onaturligt.)
    - AI Consistency Score: ${playerData.ai_consistency_score}% (Hur konsekvent spelar spelaren "perfekt" enligt AI?)
    - Circadian Rhythm Score: ${playerData.circadian_rhythm_score}% (Hur mycket avviker spelarens dygnsrytm från en normal människa? 100% = spelar som en robot dygnet runt.)
    - Session Length Uniformity: ${playerData.session_uniformity}%
    - VPIP/PFR: ${playerData.vpip_pct}% / ${playerData.pfr_pct}%
    - Aggression Factor: ${playerData.aggression_factor}
    
    Ge en bedömning i JSON-format med fälten: "judgement" ('LIKELY_BOT', 'LIKELY_HUMAN', 'INCONCLUSIVE'), "reasoning" (en kort motivering), och "confidence" (0-100).
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { judgement: 'INCONCLUSIVE', reasoning: 'API call failed.', confidence: 0 };
  }
}

export async function GET() {
  try {
    const db = await openDb();
    console.log('🧠 Synergistic Bot Hunter initierad...');

    const players = await db.all(`
      SELECT p.player_id, v.vpip_pct, v.pfr_pct, ps.aggression_factor
      FROM player_stats p
      JOIN vpip_pfr v ON p.player_id = v.player_id
      JOIN postflop_scores ps ON p.player_id = ps.player_id
      WHERE p.hands_played > 200
      LIMIT 30
    `);

    const botProfiles: SynergisticBotProfile[] = [];
    let openAiConsultations = 0;

    for (const player of players) {
      const profile: Partial<SynergisticBotProfile> & { player_id: string } = { player_id: player.player_id };
      const factors: any = {};

      // 1. Timing Impossibility
      const timingActions = await db.get(`SELECT COUNT(*) as count FROM (SELECT created_at FROM detailed_actions WHERE player_id = ? GROUP BY created_at HAVING COUNT(*) > 1)`, [player.player_id]);
      factors.timing_impossibility = Math.min(100, (timingActions?.count || 0) * 10);

      // 2. Emotional Control (Tilt)
      const tiltEvents = await db.get(`SELECT COUNT(*) as count, AVG(severity_score) as avg_severity FROM tilt_events WHERE player_id = ?`, [player.player_id]);
      factors.emotional_control_score = tiltEvents.count === 0 ? 95 : 100 - (tiltEvents.avg_severity || 0);

      // 3. AI Consistency
      const aiScores = await db.get(`SELECT avg_preflop_score, avg_postflop_score FROM ai_scores WHERE player = ?`, [player.player_id]);
      factors.ai_consistency_score = ((aiScores?.avg_preflop_score || 0.6) + (aiScores?.avg_postflop_score || 0.6)) / 2 * 100;
      
      // 4. Circadian Rhythm
      const optimalTimes = await db.get(`SELECT data_confidence FROM optimal_play_times WHERE player_id = ?`, [player.player_id]);
      factors.circadian_rhythm_score = 100 - (optimalTimes?.data_confidence || 100);

      // 5. Variance Stability (placeholder, more complex logic needed for full impl)
      const sessionAnalysis = await db.get(`SELECT AVG(duration_minutes) as avg_dur, COUNT(*) as sessions FROM session_analysis WHERE player_id = ?`, [player.player_id]);
      factors.variance_stability_score = sessionAnalysis.sessions > 5 ? 50 : 10;
      
      profile.contributing_factors = factors;

      // Calculate Synergistic Score
      profile.synergistic_score = 
        (factors.timing_impossibility * 0.40) +
        (factors.emotional_control_score * 0.25) +
        (factors.ai_consistency_score * 0.20) +
        (factors.circadian_rhythm_score * 0.15);

      if (profile.synergistic_score > 75) {
        profile.classification = 'BOT';
        profile.evidence_strength = 'STRONG';
      } else if (profile.synergistic_score < 30) {
        profile.classification = 'HUMAN';
        profile.evidence_strength = 'MODERATE';
      } else {
        profile.classification = 'UNCERTAIN';
        profile.evidence_strength = 'WEAK';
        
        // --- 🤖 GPT-4o CONSULTATION ---
        openAiConsultations++;
        profile.openai_verdict = await getOpenAIVerdict({
          ...player,
          ...factors,
          session_uniformity: sessionAnalysis.sessions
        });
        
        if (profile.openai_verdict?.judgement === 'LIKELY_BOT') {
           profile.classification = 'BOT';
           profile.evidence_strength = 'MODERATE';
        } else if (profile.openai_verdict?.judgement === 'LIKELY_HUMAN') {
           profile.classification = 'HUMAN';
           profile.evidence_strength = 'MODERATE';
        }
      }
      
      botProfiles.push(profile as SynergisticBotProfile);
    }
    
    botProfiles.sort((a, b) => b.synergistic_score - a.synergistic_score);

    return NextResponse.json({
      success: true,
      analysis_type: "SYNERGISTIC_BOT_DETECTION_WITH_OPENAI",
      players_analyzed: players.length,
      openai_consultations: openAiConsultations,
      results: botProfiles
    });

  } catch (error) {
    console.error("Synergistic hunter error:", error);
    return NextResponse.json({ error: 'Synergistic analysis failed', details: error instanceof Error ? error.message : 'Unknown'}, { status: 500 });
  }
} 
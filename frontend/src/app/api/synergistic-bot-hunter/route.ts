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
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration',
    message: 'Synergistic Bot Hunter is being migrated to Turso cloud database'
  }, { status: 503 });
} 
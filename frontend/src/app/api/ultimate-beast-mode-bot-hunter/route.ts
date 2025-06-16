import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to get a detailed analysis from GPT-4o
async function getGpt4oAnalysis(playerData: any) {
  const prompt = `
    EXPERT POKER SECURITY ANALYSIS:

    A potential poker bot has been flagged based on the following data profile.
    Analyze these metrics with the mind of a top-tier security expert.
    Provide a concise, expert judgment on whether this player is a bot, a human, or if it's ambiguous.
    Justify your reasoning based on the data provided.

    DATA PROFILE:
    - Player ID: ${playerData.player_name}
    - Total Hands: ${playerData.total_hands}
    - VPIP/PFR: ${playerData.vpip?.toFixed(2)}% / ${playerData.pfr?.toFixed(2)}%
    - VPIP/PFR Standard Deviation (Stability): ${playerData.vpip_pfr_std_dev?.toFixed(4)} (Lower is more robotic)
    - GTO Cluster Score: ${playerData.gto_cluster_score?.toFixed(2)}% (Higher is more AI-like)
    - Average Session Duration: ${playerData.avg_session_duration_minutes?.toFixed(2)} mins
    - Identical Timestamp Actions: ${playerData.simultaneous_actions} (Actions at the same exact time on different tables)
    - Betting Size Precision Score: ${playerData.bet_sizing_precision_score?.toFixed(4)} (1.0 is perfectly robotic, 0.0 is very human-like)
    - Profit Curve Linearity (R-squared): ${playerData.profit_rsquared?.toFixed(4)} (Closer to 1.0 means unnaturally consistent winnings)
    - Circadian Rhythm Score: ${playerData.circadian_rhythm_score?.toFixed(4)} (Closer to 1.0 indicates play patterns that ignore human sleep cycles)

    EXPERT JUDGMENT:
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    });
    return response.choices[0].message.content?.trim() || "No analysis available.";
  } catch (error) {
    console.error(`Error fetching GPT-4o analysis for ${playerData.player_name}:`, error);
    return "GPT-4o analysis failed.";
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration',
    message: 'Ultimate Beast Mode Bot Hunter is being migrated to Turso cloud database'
  }, { status: 503 });
} 
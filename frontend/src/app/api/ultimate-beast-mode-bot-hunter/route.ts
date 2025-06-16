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
  try {
    console.log("🔥 BEAST MODE ULTIMATE BOT DETECTOR ENGAGED 🔥");
    const db = await openDb();

    // Fetch primary player statistics from player_stats table
    const players = await db.all(`
        SELECT
            ps.player_id as player_name,
            ps.total_hands,
            ps.vpip,
            ps.pfr,
            ps.aggression_factor,
            ps.wtsd_percent,
            ps.w$sd_percent,
            (
                SELECT AVG(julianday(pe.end_time) - julianday(pe.start_time)) * 24 * 60
                FROM player_sessions pe
                WHERE pe.player_id = ps.player_id AND pe.end_time IS NOT NULL
            ) as avg_session_duration_minutes,
            (
                SELECT COUNT(*)
                FROM (
                    SELECT 1
                    FROM detailed_actions
                    WHERE player_id = ps.player_id
                    GROUP BY created_at
                    HAVING COUNT(DISTINCT table_id) > 1
                )
            ) as simultaneous_actions,
            (
              SELECT json_group_array(json_object('session', session_id, 'winnings', net_winnings))
              FROM player_sessions
              WHERE player_id = ps.player_id AND end_time IS NOT NULL
              ORDER BY start_time
            ) as session_winnings_history
        FROM player_stats ps
        WHERE ps.total_hands > 100
    `);

    // Fetch heavy analysis data
    const heavyAnalysis = await db.all(`
        SELECT
            sa.player_id as player_name,
            AVG(sa.gto_cluster) as gto_cluster_score,
            AVG(vp.vpip_std_dev) as vpip_std_dev,
            AVG(vp.pfr_std_dev) as pfr_std_dev,
            AVG(CASE WHEN ABS(sa.timing_variance) < 0.1 THEN 1 ELSE 0 END) as circadian_rhythm_score,
            AVG(CASE
                WHEN da.action_amount > 0 AND da.pot_size > 0 THEN
                    CASE
                        WHEN ABS(da.action_amount / da.pot_size - 0.33) < 0.01 THEN 1
                        WHEN ABS(da.action_amount / da.pot_size - 0.50) < 0.01 THEN 1
                        WHEN ABS(da.action_amount / da.pot_size - 0.75) < 0.01 THEN 1
                        WHEN da.action_amount % 1 = 0 THEN 0.5
                        ELSE 0
                    END
                ELSE 0
            END) as bet_sizing_precision_score
        FROM session_analysis sa
        LEFT JOIN vpip_pfr vp ON sa.player_id = vp.player AND sa.session_id = vp.session_id
        LEFT JOIN detailed_actions da ON sa.player_id = da.player_id AND sa.session_id = da.session_id
        GROUP BY sa.player_id
    `);

    const heavyAnalysisMap = new Map(heavyAnalysis.map(p => [p.player_name, p]));

    const results = [];

    for (const player of players) {
        const analysis = heavyAnalysisMap.get(player.player_name);
        if (!analysis) continue;

        const combinedData: any = { ...player, ...analysis };
        combinedData.vpip_pfr_std_dev = (analysis.vpip_std_dev || 0 + analysis.pfr_std_dev || 0) / 2;

        // Calculate Profit Curve Linearity (R-squared)
        const history = JSON.parse(combinedData.session_winnings_history || '[]');
        if (history.length > 2) {
            let cumulative_winnings = 0;
            const points = history.map((s: { winnings: number }, i: number) => {
                cumulative_winnings += s.winnings;
                return { x: i + 1, y: cumulative_winnings };
            });
            const n = points.length;
            const sumX = points.reduce((s: number, p: {x: number}) => s + p.x, 0);
            const sumY = points.reduce((s: number, p: {y: number}) => s + p.y, 0);
            const sumXY = points.reduce((s: number, p: {x: number, y: number}) => s + p.x * p.y, 0);
            const sumX2 = points.reduce((s: number, p: {x: number}) => s + p.x * p.x, 0);
            const sumY2 = points.reduce((s: number, p: {y: number}) => s + p.y * p.y, 0);
            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            combinedData.profit_rsquared = denominator === 0 ? 1 : Math.pow(numerator / denominator, 2);
        } else {
            combinedData.profit_rsquared = 0;
        }

        // --- SCORING ALGORITHM ---
        let riskScore = 0;
        if (combinedData.vpip_pfr_std_dev < 0.5) riskScore += 25;
        if (combinedData.gto_cluster_score > 40) riskScore += 20;
        if (combinedData.simultaneous_actions > 0) riskScore += 50;
        if (combinedData.avg_session_duration_minutes > 480) riskScore += 15;
        if (combinedData.bet_sizing_precision_score > 0.7) riskScore += 20;
        if (combinedData.profit_rsquared > 0.9) riskScore += 30;
        if (combinedData.circadian_rhythm_score > 0.8) riskScore += 20;

        let riskLevel = "LOW_RISK";
        if (riskScore >= 90) riskLevel = "CRITICAL_RISK";
        else if (riskScore >= 60) riskLevel = "HIGH_RISK";
        else if (riskScore >= 30) riskLevel = "SUSPICIOUS";

        if (riskLevel === "CRITICAL_RISK" || riskLevel === "HIGH_RISK") {
            const gptAnalysis = await getGpt4oAnalysis(combinedData);
            results.push({ ...combinedData, riskScore, riskLevel, gptAnalysis });
        } else if (riskLevel === "SUSPICIOUS") {
            results.push({ ...combinedData, riskScore, riskLevel, gptAnalysis: "Suspicious activity detected, further monitoring recommended." });
        }
    }

    results.sort((a, b) => b.riskScore - a.riskScore);
    
    console.log(`Beast Mode analysis complete. Found ${results.length} suspicious players.`);

    return NextResponse.json({
        totalPlayersAnalyzed: players.length,
        suspiciousPlayersFound: results.length,
        results,
    });

  } catch (error: any) {
    console.error("☠️ BEAST MODE FAILED:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
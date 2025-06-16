import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

// Helper: Shannon entropy
function shannonEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const c of Object.values(counts)) {
    const p = c / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export async function GET() {
  try {
    const db = await openDb();

    // 1) Bet-size distribution per player
    const betRows: any[] = await db.all(
      `SELECT player_id, COALESCE(bet_size_category,'unknown') AS bet_size_category, COUNT(*) as cnt
       FROM detailed_actions
       WHERE bet_size_category IS NOT NULL
       GROUP BY player_id, bet_size_category`
    );

    // Organise counts per player
    const betMap: Record<string, Record<string, number>> = {};
    for (const row of betRows) {
      if (!betMap[row.player_id]) betMap[row.player_id] = {};
      betMap[row.player_id][row.bet_size_category!] = row.cnt;
    }

    // 2) Session statistics per player
    const sessionRows: any[] = await db.all(
      `SELECT player_id,
              COUNT(*)                       AS sessions,
              SUM(duration_minutes)          AS total_minutes,
              MAX(duration_minutes)          AS longest_session
         FROM session_analysis
        GROUP BY player_id`
    );

    // Build player detections
    const detections = sessionRows.map((row: any) => {
      const entropy = shannonEntropy(betMap[row.player_id] || {});
      const lowEntropy = entropy < 1.5; // threshold
      const marathonSessions = row.longest_session > 960; // >16h

      // Composite risk score [0-100]
      let risk = 0;
      if (lowEntropy) risk += 40;
      if (marathonSessions) risk += 40;
      if (row.sessions > 100) risk += 20; // very high volume
      risk = Math.min(100, risk);

      return {
        player_id: row.player_id,
        entropy: Number(entropy.toFixed(2)),
        marathonSessions,
        totalSessions: row.sessions,
        longestSessionMin: row.longest_session,
        riskScore: risk,
      };
    });

    // Sort highest risk first
    detections.sort((a: any, b: any) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, detections });
  } catch (err) {
    console.error('Advanced bot detection error', err);
    return NextResponse.json(
      { error: 'Failed advanced detection', details: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
} 
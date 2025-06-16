import { NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

export async function GET() {
  try {
    // Simple detection based on Turso data
    const query = `
      SELECT 
        player_id,
        COUNT(*) as total_actions,
        COUNT(DISTINCT street) as streets_played,
        AVG(CASE WHEN action_type = 'fold' THEN 1 ELSE 0 END) as fold_rate
      FROM detailed_actions 
      WHERE player_id LIKE 'coinpoker%'
      GROUP BY player_id
      HAVING COUNT(*) > 100
      ORDER BY fold_rate DESC
      LIMIT 50
    `;
    
    const result = await queryTurso(query);
    
    const detections = result.rows.map((row: any) => ({
      player_id: row.player_id,
      total_actions: row.total_actions,
      streets_played: row.streets_played,
      fold_rate: parseFloat((row.fold_rate * 100).toFixed(2)),
      riskScore: Math.min(100, Math.floor(row.fold_rate * 120)), // Simple risk calculation
      detection_type: 'high_fold_rate'
    }));

    return NextResponse.json({ 
      success: true, 
      detections,
      total_detected: detections.length 
    });
  } catch (err) {
    console.error('Advanced bot detection error', err);
    return NextResponse.json(
      { error: 'Failed advanced detection', details: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
} 
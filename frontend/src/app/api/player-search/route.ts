import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const db = await openDb();

    const searchQuery = `
      SELECT DISTINCT player_id as player_name
      FROM main 
      WHERE LOWER(player_id) LIKE LOWER(?)
      ORDER BY total_hands DESC, player_id ASC
      LIMIT ?
    `;
    
    const players = await db.all(searchQuery, [`%${query}%`, limit]);

    return NextResponse.json(players.map(p => p.player_name));

  } catch (error) {
    console.error('Player search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
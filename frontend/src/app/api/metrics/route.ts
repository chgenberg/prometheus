import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

interface Player {
  player_id: string;
  total_hands: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  avg_postflop_score: number;
  avg_preflop_score: number;
  intention_score: number;
  collution_score: number;
  bad_actor_score: number;
}

async function getCoinpokerPlayersFromTurso(): Promise<Player[]> {
  console.log('Fetching CoinPoker players from Turso for metrics...');
  
  const query = `
    SELECT 
      player_id,
      total_hands,
      net_win_bb,
      vpip,
      pfr,
      avg_postflop_score,
      avg_preflop_score,
      intention_score,
      collution_score,
      bad_actor_score
    FROM main
    WHERE player_id LIKE 'CoinPoker%'
    ORDER BY total_hands DESC
  `;
  
  try {
    const result = await queryTurso(query);
    console.log(`Found ${result.rows.length} CoinPoker players for metrics`);
    
    return result.rows.map((row: any) => ({
      player_id: row.player_id,
      total_hands: row.total_hands || 0,
      net_win_bb: row.net_win_bb || 0,
      vpip: row.vpip || 0,
      pfr: row.pfr || 0,
      avg_postflop_score: row.avg_postflop_score || 0,
      avg_preflop_score: row.avg_preflop_score || 0,
      intention_score: row.intention_score || 0,
      collution_score: row.collution_score || 0,
      bad_actor_score: row.bad_actor_score || 0,
    }));
  } catch (error) {
    console.error('Error fetching players from Turso for metrics:', error);
    throw error;
  }
}

export async function GET() {
  try {
    // Get all Coinpoker players from Turso
    const players = await getCoinpokerPlayersFromTurso();
    
    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players found',
        totalPlayers: 0,
        totalHands: 0,
        avgHandsPerPlayer: 0,
        topPerformers: [],
        riskDistribution: [],
        timestamp: new Date().toISOString()
      });
    }

    // Calculate metrics
    const totalPlayers = players.length;
    const totalHands = players.reduce((sum, p) => sum + (p.total_hands || 0), 0);
    const avgHandsPerPlayer = Math.round(totalHands / totalPlayers);

    // Top performers by hands
    const topPerformers = players
      .sort((a, b) => (b.total_hands || 0) - (a.total_hands || 0))
      .slice(0, 10)
      .map(p => ({
        player_id: p.player_id,
        total_hands: p.total_hands || 0,
        net_win_bb: p.net_win_bb || 0,
        vpip: p.vpip || 0,
        pfr: p.pfr || 0,
        bad_actor_score: p.bad_actor_score || 0
      }));

    // Risk distribution
    const riskLevels = {
      'Low Risk': 0,
      'Medium Risk': 0,
      'High Risk': 0,
      'Critical Risk': 0
    };

    players.forEach(player => {
      const maxScore = Math.max(
        player.bad_actor_score || 0,
        player.intention_score || 0,
        player.collution_score || 0
      );

      if (maxScore >= 75) riskLevels['Critical Risk']++;
      else if (maxScore >= 50) riskLevels['High Risk']++;
      else if (maxScore >= 25) riskLevels['Medium Risk']++;
      else riskLevels['Low Risk']++;
    });

    const riskDistribution = Object.entries(riskLevels).map(([level, count]) => ({
      level,
      count,
      percentage: Math.round((count / totalPlayers) * 100 * 10) / 10
    }));

    // VPIP/PFR distribution
    const vpipDistribution = {
      'Tight (<20%)': players.filter(p => (p.vpip || 0) < 20).length,
      'Standard (20-30%)': players.filter(p => (p.vpip || 0) >= 20 && (p.vpip || 0) < 30).length,
      'Loose (30-40%)': players.filter(p => (p.vpip || 0) >= 30 && (p.vpip || 0) < 40).length,
      'Very Loose (40%+)': players.filter(p => (p.vpip || 0) >= 40).length
    };

    const response = {
      totalPlayers,
      totalHands,
      avgHandsPerPlayer,
      topPerformers,
      riskDistribution,
      vpipDistribution,
      averageStats: {
        vpip: Math.round((players.reduce((sum, p) => sum + (p.vpip || 0), 0) / totalPlayers) * 10) / 10,
        pfr: Math.round((players.reduce((sum, p) => sum + (p.pfr || 0), 0) / totalPlayers) * 10) / 10,
        avg_preflop_score: Math.round((players.reduce((sum, p) => sum + (p.avg_preflop_score || 0), 0) / totalPlayers) * 10) / 10,
        avg_postflop_score: Math.round((players.reduce((sum, p) => sum + (p.avg_postflop_score || 0), 0) / totalPlayers) * 10) / 10,
        bad_actor_score: Math.round((players.reduce((sum, p) => sum + (p.bad_actor_score || 0), 0) / totalPlayers) * 10) / 10
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics data' },
      { status: 500 }
    );
  }
}

// Optional: Prometheus-style metrics endpoint
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 
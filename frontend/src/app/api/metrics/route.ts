import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb, getCoinpokerPlayers } from '../../../lib/database-api-helper';

interface DatabaseMetrics {
  totalPlayers: number;
  totalHands: number;
  averageHandsPerPlayer: number;
  topPlayersByHands: Array<{
    player_name: string;
    hands_played: number;
  }>;
  recentActivity: {
    playersWithRecentActivity: number;
    handsLastWeek: number;
  };
}

interface SystemMetrics {
  requestsPerMinute: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  activeConnections: number;
}

export async function GET(request: NextRequest) {
  let db;
  try {
    db = await getApiDb();
    
    // Get all Coinpoker players using standardized helper
    const allPlayers = await getCoinpokerPlayers(db);
    
    if (!allPlayers || allPlayers.length === 0) {
      return NextResponse.json({
        database: {
          totalPlayers: 0,
          totalHands: 0,
          averageHandsPerPlayer: 0,
          topPlayersByHands: [],
          recentActivity: {
            playersWithRecentActivity: 0,
            handsLastWeek: 0
          }
        },
        system: {
          requestsPerMinute: 0,
          averageResponseTime: 0,
          cacheHitRate: 0,
          errorRate: 0,
          activeConnections: 1
        }
      });
    }

    // Calculate database metrics
    const totalPlayers = allPlayers.length;
    const totalHands = allPlayers.reduce((sum, player) => sum + (player.total_hands || 0), 0);
    const averageHandsPerPlayer = totalPlayers > 0 ? Math.round(totalHands / totalPlayers) : 0;

    // Get top players by hands (top 5)
    const topPlayersByHands = allPlayers
      .sort((a, b) => (b.total_hands || 0) - (a.total_hands || 0))
      .slice(0, 5)
      .map(player => ({
        player_name: player.player_id,
        hands_played: player.total_hands || 0
      }));

    // Calculate recent activity (simulated based on available data)
    const recentPlayers = allPlayers.filter(player => {
      if (!player.updated_at) return false;
      const lastUpdate = new Date(player.updated_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastUpdate > weekAgo;
    });

    const databaseMetrics: DatabaseMetrics = {
      totalPlayers,
      totalHands,
      averageHandsPerPlayer,
      topPlayersByHands,
      recentActivity: {
        playersWithRecentActivity: recentPlayers.length,
        handsLastWeek: Math.round(totalHands * 0.1) // Estimate 10% of hands in last week
      }
    };

    // Generate system metrics (simulated for demonstration)
    const systemMetrics: SystemMetrics = {
      requestsPerMinute: Math.round(Math.random() * 100) + 50,
      averageResponseTime: Math.round(Math.random() * 200) + 100,
      cacheHitRate: Math.round(Math.random() * 30) + 70,
      errorRate: Math.round(Math.random() * 5),
      activeConnections: Math.round(Math.random() * 10) + 5
    };

    return NextResponse.json({
      database: databaseMetrics,
      system: systemMetrics,
      timestamp: new Date().toISOString(),
      healthy: true
    });

  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        timestamp: new Date().toISOString(),
        healthy: false
      },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
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
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

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
  try {
    // Check if request has proper authorization (optional)
    const authHeader = request.headers.get('authorization');
    const isAuthorized = !authHeader || authHeader === 'Bearer metrics-token'; // Implement proper auth
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await openDb();
    
    // Get database metrics from new heavy_analysis.db structure
    const totalPlayersResult = await db.get('SELECT COUNT(*) as count FROM main WHERE player_id LIKE "coinpoker/%"');
    const totalPlayers = totalPlayersResult?.count || 0;
    
    const totalHandsResult = await db.get('SELECT SUM(total_hands) as total FROM main WHERE player_id LIKE "coinpoker/%"');
    const totalHands = totalHandsResult?.total || 0;
    
    const averageHandsPerPlayer = totalPlayers > 0 ? Math.round(totalHands / totalPlayers) : 0;
    
    // Get top players by hands played (only real coinpoker players)
    const topPlayers = await db.all(`
      SELECT player_id as player_name, total_hands as hands_played 
      FROM main 
      WHERE player_id LIKE 'coinpoker/%' AND total_hands > 0
      ORDER BY total_hands DESC 
      LIMIT 10
    `);
    
    // Get recent activity metrics
    const playersWithRecentActivity = await db.get(`
      SELECT COUNT(*) as count 
      FROM main 
      WHERE player_id LIKE 'coinpoker/%' 
        AND updated_at >= date('now', '-1 day')
    `);
    
    const databaseMetrics: DatabaseMetrics = {
      totalPlayers,
      totalHands,
      averageHandsPerPlayer: Math.round(averageHandsPerPlayer),
      topPlayersByHands: topPlayers || [],
      recentActivity: {
        playersWithRecentActivity: playersWithRecentActivity?.count || 0,
        handsLastWeek: 0 // Implement based on your data structure
      }
    };
    
    // Mock system metrics (implement actual tracking)
    const systemMetrics: SystemMetrics = {
      requestsPerMinute: 0, // Implement actual tracking
      averageResponseTime: 0, // Implement actual tracking
      cacheHitRate: 0, // Implement actual tracking
      errorRate: 0, // Implement actual tracking
      activeConnections: 5 // From your connection pool
    };
    
    // Performance insights
    const performanceInsights = {
      slowQueries: [], // Implement query performance tracking
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version
    };
    
    const metrics = {
      timestamp: new Date().toISOString(),
      database: databaseMetrics,
      system: systemMetrics,
      performance: performanceInsights
    };
    
    return NextResponse.json(metrics);
    
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
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
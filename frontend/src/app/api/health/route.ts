import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test Turso database connection
    const query = `SELECT COUNT(*) as count FROM main WHERE player_id LIKE 'CoinPoker%'`;
    const result = await queryTurso(query);
    const playerCount = result.rows[0]?.count || 0;
    
    const dbResponseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: playerCount > 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: dbResponseTime,
        playerCount: playerCount
      },
      system: {
        uptime: process.uptime() * 1000,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        }
      },
      environment: process.env.NODE_ENV || 'development',
      provider: 'turso'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      provider: 'turso',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
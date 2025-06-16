import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb } from '../../../lib/database-api-helper';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test database connection
    let db;
    try {
      db = await getApiDb();
      
      // Test query
      const result = await db.get('SELECT COUNT(*) as count FROM main LIMIT 1');
      const dbResponseTime = Date.now() - startTime;
      
      await closeDb(db);
      
      // Check if we have players
      const playerCount = result?.count || 0;
      
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
        environment: process.env.NODE_ENV || 'development'
      });
      
    } catch (dbError) {
      if (db) await closeDb(db);
      
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: dbError instanceof Error ? dbError.message : 'Database connection failed'
        },
        system: {
          uptime: process.uptime() * 1000,
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
          }
        },
        environment: process.env.NODE_ENV || 'development'
      }, { status: 503 });
    }
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 500 });
  }
} 
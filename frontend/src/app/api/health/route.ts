import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, getCachedQuery } from '../../../lib/database-unified';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    responseTime: number;
  };
  cache: {
    size: number;
    hitRate: number;
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Track system start time
const startTime = Date.now();

export async function GET(request: NextRequest) {
  const healthCheckStart = Date.now();
  
  try {
    // Check database health
    const dbHealthy = await checkDatabaseHealth();
    const dbResponseTime = Date.now() - healthCheckStart;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;
    
    // Calculate uptime
    const uptime = Date.now() - startTime;
    
    // Mock cache statistics (you can implement actual cache size tracking)
    const cacheSize = 0; // Implement actual cache size if needed
    const cacheHitRate = 0; // Implement actual hit rate if needed
    
    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!dbHealthy) {
      status = 'unhealthy';
    } else if (dbResponseTime > 1000 || memoryPercentage > 90) {
      status = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        responseTime: dbResponseTime
      },
      cache: {
        size: cacheSize,
        hitRate: cacheHitRate
      },
      system: {
        uptime,
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage
        }
      }
    };
    
    // Return appropriate HTTP status based on health
    const httpStatus = status === 'healthy' ? 200 : 
                      status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: httpStatus });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      database: {
        connected: false,
        responseTime: -1
      },
      cache: {
        size: 0,
        hitRate: 0
      },
      system: {
        uptime: Date.now() - startTime,
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        }
      }
    }, { status: 503 });
  }
} 
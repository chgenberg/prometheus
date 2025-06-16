'use client';

import React, { useState, useEffect } from 'react';
import { Server, Database, Activity, Clock, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface SystemStatus {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    totalPlayers: number;
    totalHands: number;
    lastUpdate: string;
  };
  apis: {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    lastChecked: string;
  }[];
  performance: {
    avgResponseTime: number;
    uptime: string;
    requestsPerMinute: number;
  };
}

export default function SystemStatusDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      setLoading(true);
      const startTime = Date.now();

      // Test multiple APIs to check system health
      const apiTests = [
        { name: 'Security Overview', endpoint: '/api/security-overview' },
        { name: 'Players', endpoint: '/api/players?limit=1' },
        { name: 'Postflop Analysis', endpoint: '/api/postflop-analysis' },
        { name: 'Hand History', endpoint: '/api/hand-history' },
        { name: 'Real-time Activity', endpoint: '/api/real-time-activity?limit=1' }
      ];

      const apiResults = await Promise.allSettled(
        apiTests.map(async (test) => {
          const testStart = Date.now();
          const response = await fetch(test.endpoint);
          const responseTime = Date.now() - testStart;
          
          return {
            name: test.name,
            status: response.ok ? 'healthy' as const : 'error' as const,
            responseTime,
            lastChecked: new Date().toISOString()
          };
        })
      );

      // Get database stats
              const playersResponse = await fetch('/api/players?limit=1');
      const playersData = await playersResponse.json();
      
              const handHistoryResponse = await fetch('/api/hand-history');
      const handHistoryData = await handHistoryResponse.json();

      const dbResponseTime = Date.now() - startTime;
      const avgResponseTime = apiResults
        .filter(result => result.status === 'fulfilled')
        .reduce((sum, result) => sum + (result.value as any).responseTime, 0) / apiResults.length;

      setStatus({
        database: {
          status: playersResponse.ok ? 'healthy' : 'error',
          responseTime: dbResponseTime,
          totalPlayers: playersData.totalCount || 0,
          totalHands: handHistoryData.total_hands || 0,
          lastUpdate: new Date().toISOString()
        },
        apis: apiResults.map(result => 
          result.status === 'fulfilled' ? result.value as any : {
            name: 'Unknown',
            status: 'error' as const,
            responseTime: 0,
            lastChecked: new Date().toISOString()
          }
        ),
        performance: {
          avgResponseTime,
          uptime: '99.9%', // This would come from actual monitoring
          requestsPerMinute: Math.floor(Math.random() * 50) + 20 // Simulated
        }
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to check system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-500/20 border-green-500/30';
      case 'warning': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      case 'error': return 'text-red-500 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-500 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading && !status) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6">
      {/* Header - Keep refresh functionality */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-400">Last Updated</p>
            <p className="text-sm text-white">{lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={checkSystemStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-400">Database</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status.database.status)}`}>
                  {getStatusIcon(status.database.status)}
                  <span className="ml-1">{status.database.status.toUpperCase()}</span>
                </span>
                <span className="text-xs text-gray-500">{status.database.responseTime}ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-400">Performance</p>
              <p className="text-lg font-bold text-white">{status.performance.avgResponseTime.toFixed(0)}ms</p>
              <p className="text-xs text-gray-500">Avg Response Time</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="text-lg font-bold text-white">{status.performance.uptime}</p>
              <p className="text-xs text-gray-500">{status.performance.requestsPerMinute} req/min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Statistics */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-xl border border-gray-700/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          Database Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{status.database.totalPlayers.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Players</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{status.database.totalHands.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Hands</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{status.database.responseTime}ms</p>
            <p className="text-sm text-gray-400">DB Response Time</p>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-xl border border-gray-700/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-green-500" />
          API Endpoints Status
        </h3>
        <div className="space-y-3">
          {status.apis.map((api, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(api.status)}
                <span className="text-white font-medium">{api.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(api.status)}`}>
                  {api.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-400">{api.responseTime}ms</span>
                <span className="text-xs text-gray-500">
                  {new Date(api.lastChecked).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
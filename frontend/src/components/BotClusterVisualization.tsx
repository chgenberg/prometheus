'use client';

import React, { useState, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js';
import { AlertTriangle, Users, Target, Shield, Eye, Filter } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

interface ClusterData {
  player_name: string;
  x: number;
  y: number;
  hands_played: number;
  preflop_vpip: number;
  preflop_pfr: number;
  bot_risk: number;
  player_type: string;
  color: string;
  intention_score: number;
  collusion_score: number;
  bad_actor_score: number;
  ai_score: number;
}

interface ClusterAnalysis {
  id: number;
  size: number;
  avgBotRisk: number;
  avgHands: number;
  suspiciousCount: number;
  clusterType: string;
  alertLevel: string;
  centroid: { x: number; y: number };
}

interface ClusterSummary {
  totalPlayers: number;
  suspiciousPlayers: number;
  highRiskClusters: number;
  averageBotRisk: number;
  clustersFound: number;
}

export default function BotClusterVisualization() {
  const [clusterData, setClusterData] = useState<ClusterData[]>([]);
  const [clusterAnalysis, setClusterAnalysis] = useState<ClusterAnalysis[]>([]);
  const [summary, setSummary] = useState<ClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<ClusterData | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchClusterData();
  }, []);

  const fetchClusterData = async () => {
    try {
      console.log('Fetching bot clusters data...');
      const response = await fetch('/api/bot-clusters');
      const result = await response.json();
      
      console.log('Bot clusters response:', result);
      
      if (result.success) {
        console.log('Setting cluster data:', result.data.length, 'players');
        setClusterData(result.data);
        setClusterAnalysis(result.clusters);
        setSummary(result.summary);
      } else {
        console.error('Bot clusters API returned error:', result);
      }
    } catch (error) {
      console.error('Failed to fetch cluster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (filterType === 'all') return clusterData;
    if (filterType === 'suspicious') return clusterData.filter(p => p.bot_risk > 50);
    if (filterType === 'clean') return clusterData.filter(p => p.bot_risk <= 30);
    if (filterType === 'elite') return clusterData.filter(p => p.player_type === 'Elite Player');
    return clusterData.filter(p => p.player_type === filterType);
  };

  const createChartData = () => {
    const filteredData = getFilteredData();
    
    // Group data by player type for legend
    const datasets: any[] = [];
    const playerTypes = [...new Set(filteredData.map(p => p.player_type))];
    
    playerTypes.forEach(type => {
      const typeData = filteredData.filter(p => p.player_type === type);
      const firstOfType = typeData[0];
      
      if (typeData.length > 0) {
        datasets.push({
          label: `${type} (${typeData.length})`,
          data: typeData.map(player => ({
            x: player.x * 100, // Scale to 0-100 for better visibility
            y: player.y,
            player: player
          })),
          backgroundColor: firstOfType.color,
          borderColor: firstOfType.color,
          pointRadius: (context: any) => {
            const player = context.raw.player;
            return Math.max(3, Math.min(12, Math.sqrt(player.hands_played / 50)));
          },
          pointHoverRadius: 8,
        });
      }
    });

    return { datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'PFR/VPIP Ratio (0 = Loose, 100 = Tight)',
          color: '#9ca3af'
        },
        min: 0,
        max: 100,
        grid: {
          color: '#374151'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'AI Quality Score (0 = Poor, 100 = Elite)',
          color: '#9ca3af'
        },
        min: 0,
        max: 100,
        grid: {
          color: '#374151'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d1d5db',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#4b5563',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            return context[0].raw.player.player_name;
          },
          label: (context: any) => {
            const player = context.raw.player;
            return [
              `Type: ${player.player_type}`,
              `Bot Risk: ${player.bot_risk}%`,
              `Hands: ${player.hands_played.toLocaleString()}`,
              `VPIP: ${player.preflop_vpip}%`,
              `PFR: ${player.preflop_pfr}%`,
              `AI Score: ${Math.round(player.ai_score)}`
            ];
          }
        }
      }
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const element = elements[0];
        const player = event.chart.data.datasets[element.datasetIndex].data[element.index].player;
        setSelectedPlayer(player);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing bot clusters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-red-900 p-2 rounded text-white text-sm">
        Debug: Data loaded = {clusterData.length} players, Summary = {summary ? 'YES' : 'NO'}
      </div>
      
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalPlayers}</div>
                <div className="text-xs text-gray-400">Total Players</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <div className="text-2xl font-bold text-red-400">{summary.suspiciousPlayers}</div>
                <div className="text-xs text-gray-400">Suspicious</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-orange-400 mr-2" />
              <div>
                <div className="text-2xl font-bold text-orange-400">{summary.highRiskClusters}</div>
                <div className="text-xs text-gray-400">High Risk Clusters</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-yellow-400 mr-2" />
              <div>
                <div className="text-2xl font-bold text-yellow-400">{summary.averageBotRisk}%</div>
                <div className="text-xs text-gray-400">Avg Bot Risk</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-green-400 mr-2" />
              <div>
                <div className="text-2xl font-bold text-green-400">{summary.clustersFound}</div>
                <div className="text-xs text-gray-400">Clusters Found</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-gray-300 font-medium">Filter View:</span>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Players', color: 'bg-gray-600' },
              { key: 'suspicious', label: 'Suspicious', color: 'bg-red-600' },
              { key: 'clean', label: 'Clean', color: 'bg-green-600' },
              { key: 'elite', label: 'Elite', color: 'bg-blue-600' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filterType === filter.key 
                    ? `${filter.color} text-white` 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Cluster Visualization */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">🕵️ Bot Cluster Map</h2>
          <p className="text-gray-400 text-sm">
            Interactive map showing all players clustered by behavior patterns. 
            <span className="text-blue-400"> Click any point for detailed analysis.</span>
          </p>
        </div>
        
        <div style={{ height: '500px', position: 'relative' }}>
          <Scatter data={createChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Cluster Analysis Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Cluster Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2 text-gray-300">Cluster</th>
                <th className="text-left p-2 text-gray-300">Size</th>
                <th className="text-left p-2 text-gray-300">Avg Risk</th>
                <th className="text-left p-2 text-gray-300">Suspicious</th>
                <th className="text-left p-2 text-gray-300">Type</th>
                <th className="text-left p-2 text-gray-300">Alert Level</th>
              </tr>
            </thead>
            <tbody>
              {clusterAnalysis.map(cluster => (
                <tr key={cluster.id} className="border-b border-gray-700/50">
                  <td className="p-2 text-white">#{cluster.id + 1}</td>
                  <td className="p-2 text-gray-300">{cluster.size} players</td>
                  <td className="p-2">
                    <span className={`font-medium ${
                      cluster.avgBotRisk > 60 ? 'text-red-400' :
                      cluster.avgBotRisk > 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {cluster.avgBotRisk}%
                    </span>
                  </td>
                  <td className="p-2 text-gray-300">{cluster.suspiciousCount}</td>
                  <td className="p-2 text-gray-300">{cluster.clusterType}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      cluster.alertLevel === 'high' ? 'bg-red-600 text-white' :
                      cluster.alertLevel === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {cluster.alertLevel.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Player Analysis</h3>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">Player:</span>
                <span className="text-white font-medium ml-2">{selectedPlayer.player_name}</span>
              </div>
              
              <div>
                <span className="text-gray-400">Type:</span>
                <span 
                  className="font-medium ml-2"
                  style={{ color: selectedPlayer.color }}
                >
                  {selectedPlayer.player_type}
                </span>
              </div>
              
              <div>
                <span className="text-gray-400">Bot Risk:</span>
                <span className={`font-bold ml-2 ${
                  selectedPlayer.bot_risk > 60 ? 'text-red-400' :
                  selectedPlayer.bot_risk > 40 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {selectedPlayer.bot_risk}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-xs text-gray-400">Hands Played</div>
                  <div className="text-white font-medium">{selectedPlayer.hands_played.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">AI Score</div>
                  <div className="text-white font-medium">{Math.round(selectedPlayer.ai_score)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">VPIP</div>
                  <div className="text-white font-medium">{selectedPlayer.preflop_vpip}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">PFR</div>
                  <div className="text-white font-medium">{selectedPlayer.preflop_pfr}%</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button 
                  onClick={() => window.open(`/?player=${encodeURIComponent(selectedPlayer.player_name)}`, '_blank')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded font-medium transition-colors"
                >
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
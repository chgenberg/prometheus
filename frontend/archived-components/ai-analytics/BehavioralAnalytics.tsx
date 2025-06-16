import React, { useState, useEffect } from 'react';
import { AlertTriangle, Brain, TrendingUp, Target, Shield, Zap } from 'lucide-react';

interface BehavioralData {
  player_id: string;
  total_hands: number;
  avg_preflop_score: number;
  avg_postflop_score: number;
  intention_score: number;
  collusion_score: number;
  bad_actor_score: number;
  tilt_events_count?: number;
  avg_session_length?: number;
  fatigue_score?: number;
}

interface BehavioralAnalyticsProps {
  playerData?: BehavioralData;
  showOverview?: boolean;
}

export default function BehavioralAnalytics({ playerData, showOverview = true }: BehavioralAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<BehavioralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showOverview && !playerData) {
      fetchAnalyticsOverview();
    }
  }, [showOverview, playerData]);

  const fetchAnalyticsOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/players?limit=5');
      const data = await response.json();
      
      if (data.players) {
        setAnalyticsData(data.players);
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, threshold: { low: number; high: number }) => {
    if (score < threshold.low) return 'text-red-400';
    if (score > threshold.high) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getScoreStyle = (score: number, threshold: { low: number; high: number }) => {
    if (score < threshold.low) return 'bg-red-100 border-red-300';
    if (score > threshold.high) return 'bg-green-100 border-green-300';
    return 'bg-yellow-100 border-yellow-300';
  };

  const ScoreCard = ({ title, score, icon: Icon, threshold, description }: {
    title: string;
    score: number;
    icon: any;
    threshold: { low: number; high: number };
    description: string;
  }) => (
    <div className={`p-4 rounded-lg border-2 ${getScoreStyle(score, threshold)} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
      <div className="mb-3">
        <span className={`text-2xl font-bold ${getScoreColor(score, threshold)}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 ml-1">/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            score < threshold.low ? 'bg-red-400' : 
            score > threshold.high ? 'bg-green-400' : 'bg-yellow-400'
          }`}
          style={{ width: `${Math.min(score, 100)}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );

  const PlayerAnalysisRow = ({ player }: { player: BehavioralData }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{player.player_id}</div>
        <div className="text-sm text-gray-500">{player.total_hands} hands</div>
      </div>
      
      <div className="flex gap-2">
        <span className={`px-2 py-1 text-xs rounded-md font-medium ${
          player.avg_preflop_score < 30 ? 'bg-red-100 text-red-700' :
          player.avg_preflop_score > 70 ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          Pre: {player.avg_preflop_score.toFixed(0)}
        </span>
        <span className={`px-2 py-1 text-xs rounded-md font-medium ${
          player.avg_postflop_score < 40 ? 'bg-red-100 text-red-700' :
          player.avg_postflop_score > 80 ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          Post: {player.avg_postflop_score.toFixed(0)}
        </span>
        <span className={`px-2 py-1 text-xs rounded-md font-medium ${
          player.intention_score < 40 ? 'bg-red-100 text-red-700' :
          player.intention_score > 70 ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          Intent: {player.intention_score.toFixed(0)}
        </span>
        {player.bad_actor_score > 50 && (
          <span className="px-2 py-1 text-xs rounded-md font-medium bg-red-100 text-red-700 animate-pulse">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Risk
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Behavioral Analytics</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Behavioral Analytics</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Single player view
  if (playerData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ScoreCard
            title="Preflop Decision Quality"
            score={playerData.avg_preflop_score}
            icon={Target}
            threshold={{ low: 30, high: 70 }}
            description="Quality of preflop decisions and hand selection"
          />
          
          <ScoreCard
            title="Postflop Execution"
            score={playerData.avg_postflop_score}
            icon={TrendingUp}
            threshold={{ low: 40, high: 80 }}
            description="Postflop play quality and decision making"
          />
          
          <ScoreCard
            title="Strategic Intention"
            score={playerData.intention_score}
            icon={Brain}
            threshold={{ low: 40, high: 70 }}
            description="Clarity and consistency of strategic approach"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreCard
            title="Collusion Risk"
            score={playerData.collusion_score}
            icon={Shield}
            threshold={{ low: 20, high: 60 }}
            description="Statistical anomalies suggesting collusion"
          />
          
          <ScoreCard
            title="Bad Actor Score"
            score={playerData.bad_actor_score}
            icon={AlertTriangle}
            threshold={{ low: 30, high: 60 }}
            description="Overall risk assessment for problematic behavior"
          />
        </div>

        {playerData.tilt_events_count && playerData.tilt_events_count > 0 && (
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-orange-900">Tilt Analysis</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {playerData.tilt_events_count}
                </div>
                <p className="text-sm text-orange-700">Tilt Events Detected</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {playerData.avg_session_length?.toFixed(1) || 'N/A'}h
                </div>
                <p className="text-sm text-orange-700">Avg Session Length</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Overview mode
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Behavioral Analytics Overview</h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        AI-powered analysis of player behavior patterns and decision quality
      </p>
      
      <div className="space-y-3">
        {analyticsData.map((player, index) => (
          <PlayerAnalysisRow key={player.player_id || index} player={player} />
        ))}
      </div>
      
      {analyticsData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No behavioral analytics data available</p>
        </div>
      )}
    </div>
  );
} 
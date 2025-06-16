'use client';

import { useState } from 'react';
import { Clock, AlertTriangle, Target, Activity } from 'lucide-react';

interface TimingBotSignature {
  player_id: string;
  bot_probability: number;
  timing_anomalies: {
    simultaneous_actions: number;
    same_second_actions: number;
    action_intervals_ms: number[];
    avg_reaction_time: number;
    reaction_time_variance: number;
    session_start_clustering: number;
    session_length_uniformity: number;
    break_pattern_regularity: number;
    cross_table_correlation: number;
    synchronized_decisions: number;
    activity_24h_entropy: number;
    weekend_vs_weekday_consistency: number;
  };
  evidence_strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'OVERWHELMING';
  human_impossibility_score: number;
}

interface TimingAnalysisResult {
  success: boolean;
  analysis_type: string;
  timestamp: string;
  players_analyzed: number;
  suspicious_players: number;
  critical_cases: number;
  strong_cases: number;
  detection_summary: {
    avg_bot_probability: number;
    avg_impossibility_score: number;
    most_common_anomalies: Record<string, number>;
  };
  signatures: TimingBotSignature[];
  methodology: Record<string, string>;
}

export default function TimingBotHunter() {
  const [analysisResult, setAnalysisResult] = useState<TimingAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTimingAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/timing-based-bot-hunter');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setAnalysisResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getEvidenceColor = (strength: string) => {
    switch (strength) {
      case 'OVERWHELMING': return 'bg-red-500 text-white';
      case 'STRONG': return 'bg-orange-500 text-white';
      case 'MODERATE': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTimingAnomalies = (anomalies: TimingBotSignature['timing_anomalies']) => {
    const criticalAnomalies = [];
    
    if (anomalies.simultaneous_actions > 0) {
      criticalAnomalies.push(`⚡ ${anomalies.simultaneous_actions} simultana actions (FYSISKT OMÖJLIGT)`);
    }
    if (anomalies.session_start_clustering > 70) {
      criticalAnomalies.push(`🕐 ${anomalies.session_start_clustering.toFixed(0)}% session clustering`);
    }
    if (anomalies.reaction_time_variance < 1000) {
      criticalAnomalies.push(`🤖 Extremt låg timing-variance (${anomalies.reaction_time_variance.toFixed(0)}ms)`);
    }
    if (anomalies.activity_24h_entropy > 85) {
      criticalAnomalies.push(`🌍 ${anomalies.activity_24h_entropy.toFixed(0)}% jämn 24h aktivitet`);
    }
    
    return criticalAnomalies;
  };

  return (
    <div className="space-y-6">
      {/* Main Control Card */}
      <div className="bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/50 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Timing-Based Bot Hunter</h2>
            <p className="text-gray-400">Avancerad timing-analys som upptäcker fysiskt omöjliga mänskliga beteenden</p>
          </div>
        </div>
        
        <button 
          onClick={runTimingAnalysis} 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Activity className="h-5 w-5 animate-spin" />
              Analyserar timing-signatures...
            </>
          ) : (
            <>
              <Target className="h-5 w-5" />
              Kör Timing-Analys
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {analysisResult && (
        <>
          {/* Summary Card */}
          <div className="bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/50 shadow-2xl">
            <h3 className="text-2xl font-bold text-red-400 mb-2">🚨 TIMING ANALYSIS RESULTAT</h3>
            <p className="text-gray-400 mb-6">
              Analyserat {analysisResult.players_analyzed} spelare för timing-anomalier
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                <div className="text-3xl font-bold text-red-400">{analysisResult.suspicious_players}</div>
                <div className="text-sm text-gray-400">Misstänkta</div>
              </div>
              <div className="text-center bg-red-600/10 p-4 rounded-lg border border-red-600/20">
                <div className="text-3xl font-bold text-red-500">{analysisResult.critical_cases}</div>
                <div className="text-sm text-gray-400">OVERWHELMING</div>
              </div>
              <div className="text-center bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                <div className="text-3xl font-bold text-orange-400">
                  {analysisResult.detection_summary.avg_impossibility_score.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-400">Avg Impossibility</div>
              </div>
              <div className="text-center bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                <div className="text-3xl font-bold text-yellow-400">
                  {analysisResult.detection_summary.avg_bot_probability.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-400">Avg Bot Risk</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="font-medium text-white mb-3">Vanligaste Anomalier:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysisResult.detection_summary.most_common_anomalies).map(([anomaly, count]) => (
                  <span key={anomaly} className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {anomaly}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Top Suspects */}
          <div className="bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/50 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">🎯 TOP TIMING-BASERADE MISSTÄNKTA</h3>
            <p className="text-gray-400 mb-6">
              Spelare med timing-signatures som är fysiskt omöjliga för människor
            </p>
            
            <div className="space-y-4">
              {analysisResult.signatures.slice(0, 10).map((signature, index) => (
                <div key={signature.player_id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-white">#{index + 1}</div>
                      <div>
                        <div className="font-bold text-lg text-white">{signature.player_id}</div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEvidenceColor(signature.evidence_strength)}`}>
                          {signature.evidence_strength}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-red-400">
                        {signature.human_impossibility_score.toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-400">Impossibility Score</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Bot Probability Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Bot Probability</span>
                        <span className="text-white font-medium">{signature.bot_probability.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${signature.bot_probability}%` }}
                        />
                      </div>
                    </div>

                    {/* Timing Anomalies */}
                    <div className="border-t border-gray-600 pt-3">
                      <h5 className="font-medium text-white mb-2">🔍 Timing Anomalies:</h5>
                      <div className="space-y-1">
                        {formatTimingAnomalies(signature.timing_anomalies).map((anomaly, i) => (
                          <div key={i} className="text-sm text-red-400 font-mono bg-red-900/20 p-2 rounded">
                            {anomaly}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-gray-700/30 p-2 rounded">
                        <span className="text-gray-400 block">Avg Reaction:</span>
                        <div className="font-mono text-white">
                          {(signature.timing_anomalies.avg_reaction_time / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="bg-gray-700/30 p-2 rounded">
                        <span className="text-gray-400 block">Variance:</span>
                        <div className="font-mono text-white">
                          {signature.timing_anomalies.reaction_time_variance.toFixed(0)}ms
                        </div>
                      </div>
                      <div className="bg-gray-700/30 p-2 rounded">
                        <span className="text-gray-400 block">24h Entropy:</span>
                        <div className="font-mono text-white">
                          {signature.timing_anomalies.activity_24h_entropy.toFixed(0)}%
                        </div>
                      </div>
                      <div className="bg-gray-700/30 p-2 rounded">
                        <span className="text-gray-400 block">Session Cluster:</span>
                        <div className="font-mono text-white">
                          {signature.timing_anomalies.session_start_clustering.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/50 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-4">🧠 Detection Methodology</h3>
            <div className="space-y-3">
              {Object.entries(analysisResult.methodology).map(([key, description]) => (
                <div key={key} className="border-l-4 border-blue-500 pl-4 bg-blue-900/10 p-3 rounded-r">
                  <div className="font-bold text-blue-400 mb-1">
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-gray-300 text-sm">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 
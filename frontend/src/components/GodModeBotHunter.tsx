'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion, ShieldOff, Skull, Zap, Activity } from 'lucide-react';

// Interfaces
interface GodModeProfile {
  player_id: string;
  threat_level: 'NO_THREAT' | 'LOW_RISK' | 'SUSPICIOUS' | 'HIGH_RISK' | 'CRITICAL_BOT';
  final_score: number;
  factors: {
    timing: number;
    emotion: number;
    consistency: number;
    circadian: number;
  };
  gpt4o_verdict?: {
    judgement: string;
    reasoning: string;
    confidence: number;
  };
}

interface GodModeResult {
  analysis_type: string;
  summary: {
    total_players_analyzed: number;
    gpt4o_consultations: number;
    critical_bots: number;
    high_risk: number;
    suspicious: number;
    low_risk: number;
    no_threat: number;
  };
  results: GodModeProfile[];
}

const ThreatLevel = ({ level }: { level: GodModeProfile['threat_level'] }) => {
  const config = {
    CRITICAL_BOT: { Icon: Skull, color: 'text-red-500', label: 'Critical Bot' },
    HIGH_RISK: { Icon: ShieldAlert, color: 'text-orange-500', label: 'High Risk' },
    SUSPICIOUS: { Icon: ShieldQuestion, color: 'text-yellow-500', label: 'Suspicious' },
    LOW_RISK: { Icon: ShieldCheck, color: 'text-blue-500', label: 'Low Risk' },
    NO_THREAT: { Icon: ShieldCheck, color: 'text-green-500', label: 'No Threat' }
  };
  const { Icon, color, label } = config[level];
  return (
    <div className={`flex items-center gap-2 font-bold ${color}`}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </div>
  );
};

export default function GodModeBotHunter() {
  const [result, setResult] = useState<GodModeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/god-mode-bot-hunter');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'God Mode analysis failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Control Panel */}
      <div className="bg-gradient-to-tr from-gray-900 via-red-900/50 to-black p-6 rounded-3xl border-2 border-red-800/80 shadow-2xl shadow-red-500/20">
        <div className="flex items-center gap-4 mb-4">
          <Zap className="w-10 h-10 text-red-500 animate-pulse" />
          <div>
            <h2 className="text-3xl font-black text-white tracking-wider">PROMETHEUS GOD MODE</h2>
            <p className="text-red-300">Total system analysis. Maximum aggression. No compromises.</p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg shadow-red-500/30"
        >
          {isLoading ? (
            <>
              <Activity className="h-6 w-6 animate-spin" />
              <span>ANALYSIS IN PROGRESS...</span>
            </>
          ) : (
            <span>UNLEASH GOD MODE</span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border-2 border-red-700 rounded-lg p-4 text-center">
          <h3 className="text-xl font-bold text-red-400">ANALYSIS FAILED</h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Global Threat Assessment</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {Object.entries(result.summary)
                  .filter(([key]) => key !== 'total_players_analyzed' && key !== 'gpt4o_consultations')
                  .map(([key, value]) => (
                    <div key={key} className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-3xl font-bold text-red-500">{value as number}</p>
                        <p className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    </div>
                ))}
            </div>
             <p className="text-center text-sm text-gray-400 mt-4">
               {result.summary.total_players_analyzed} players analyzed, {result.summary.gpt4o_consultations} cases reviewed by GPT-4o.
            </p>
          </div>

          {/* Player List */}
          <div className="space-y-4">
            {result.results.map((profile, index) => (
              <div key={profile.player_id} className="bg-gray-900/50 backdrop-blur-lg rounded-xl border border-gray-700 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xl font-bold text-white">{profile.player_id}</p>
                    <ThreatLevel level={profile.threat_level} />
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Final Score</p>
                    <p className="text-3xl font-bold text-red-500">{profile.final_score.toFixed(0)}</p>
                  </div>
                </div>

                {/* Factors */}
                <div className="grid grid-cols-4 gap-3 text-center mb-4 text-sm">
                    {Object.entries(profile.factors).map(([key, value]) => (
                        <div key={key} className="bg-gray-800 p-2 rounded-md">
                            <p className="text-gray-400 capitalize text-xs">{key}</p>
                            <p className="font-bold text-white">{value.toFixed(0)}</p>
                        </div>
                    ))}
                </div>

                {/* GPT-4o Verdict */}
                {profile.gpt4o_verdict && (
                  <div className="border-t-2 border-dashed border-red-800/50 pt-3 mt-3">
                      <div className="flex items-center gap-3 mb-2">
                         <img src="/openai-logo.svg" alt="OpenAI" className="w-5 h-5" />
                         <h4 className="text-md font-bold text-white">GPT-4o Expert Verdict</h4>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-gray-700 text-sm">
                         <p className="text-red-300">
                            <span className="font-bold">Judgment:</span> {profile.gpt4o_verdict.judgement} ({profile.gpt4o_verdict.confidence}%)
                         </p>
                         <p className="text-gray-300 mt-1 italic">"{profile.gpt4o_verdict.reasoning}"</p>
                      </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 
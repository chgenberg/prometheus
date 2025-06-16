'use client';

import { useState } from 'react';
import { BrainCircuit, AlertTriangle, Target, Activity, Bot, User, HelpCircle } from 'lucide-react';

// Interfaces
interface SynergisticBotProfile {
  player_id: string;
  synergistic_score: number;
  contributing_factors: {
    timing_impossibility: number;
    emotional_control_score: number;
    ai_consistency_score: number;
    circadian_rhythm_score: number;
    variance_stability_score: number;
  };
  classification: 'HUMAN' | 'BOT' | 'UNCERTAIN';
  evidence_strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'CONCLUSIVE';
  openai_verdict?: {
    judgement: 'LIKELY_BOT' | 'LIKELY_HUMAN' | 'INCONCLUSIVE';
    reasoning: string;
    confidence: number;
  };
}

interface AnalysisResult {
  success: boolean;
  analysis_type: string;
  players_analyzed: number;
  openai_consultations: number;
  results: SynergisticBotProfile[];
}


export default function SynergisticBotHunter() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const response = await fetch('/api/synergistic-bot-hunter');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Synergistic analysis failed');
      setAnalysisResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const ClassificationIcon = ({ classification }: { classification: string }) => {
    switch (classification) {
      case 'BOT': return <Bot className="w-6 h-6 text-red-400" />;
      case 'HUMAN': return <User className="w-6 h-6 text-green-400" />;
      default: return <HelpCircle className="w-6 h-6 text-yellow-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-xl p-6 rounded-3xl border border-purple-700/50 shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <BrainCircuit className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Synergistic Bot Hunter</h2>
            <p className="text-gray-300">Kombinerar alla datakällor och konsulterar GPT-4o för ultimat precision.</p>
          </div>
        </div>
        <button 
          onClick={runAnalysis} 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Activity className="h-5 w-5 animate-spin" />
              <span>Kör Synergistisk Analys...</span>
            </>
          ) : (
            <>
              <Target className="h-5 w-5" />
              <span>Starta Ultimate Bot Hunter</span>
            </>
          )}
        </button>
        {analysisResult && (
           <p className="text-center text-sm text-purple-300 mt-4">
             Analys klar! {analysisResult.players_analyzed} spelare analyserade, {analysisResult.openai_consultations} fall granskade av GPT-4o.
           </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Results */}
      {analysisResult && (
        <div className="space-y-4">
          {analysisResult.results.map((profile, index) => (
            <div key={profile.player_id} className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                    <div className="flex items-center gap-3">
                        <ClassificationIcon classification={profile.classification} />
                        <div>
                           <p className="text-xl font-bold text-white">{profile.player_id}</p>
                           <p className={`text-sm font-medium ${profile.classification === 'BOT' ? 'text-red-400' : 'text-green-400'}`}>
                              Klassificering: {profile.classification} ({profile.evidence_strength})
                           </p>
                        </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Synergistic Score</p>
                    <p className="text-3xl font-bold text-purple-400">{profile.synergistic_score.toFixed(0)}%</p>
                  </div>
                </div>

                {/* Contributing Factors */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center mb-4">
                  {Object.entries(profile.contributing_factors).map(([key, value]) => (
                    <div key={key} className="bg-gray-800/60 p-2 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-semibold text-white">{(value as number).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
                
                {/* OpenAI Verdict */}
                {profile.openai_verdict && (
                  <div className="border-t-2 border-dashed border-purple-700/50 pt-4 mt-4">
                      <div className="flex items-center gap-3 mb-2">
                         <img src="/openai-logo.svg" alt="OpenAI" className="w-6 h-6" />
                         <h4 className="text-lg font-bold text-white">GPT-4o Expert Verdict</h4>
                      </div>
                      <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
                         <p className="text-purple-300 font-mono text-md">
                            <span className="font-bold">Judgment:</span> {profile.openai_verdict.judgement} ({profile.openai_verdict.confidence}%)
                         </p>
                         <p className="text-gray-300 mt-2 italic">"{profile.openai_verdict.reasoning}"</p>
                      </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
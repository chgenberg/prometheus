"use client";

import { useState } from 'react';
import { Zap } from "lucide-react";

interface BeastModeResult {
    player_name: string;
    riskScore: number;
    riskLevel: 'CRITICAL_RISK' | 'HIGH_RISK' | 'SUSPICIOUS' | 'LOW_RISK';
    gptAnalysis: string;
    total_hands: number;
    vpip: number;
    pfr: number;
    vpip_pfr_std_dev: number;
    gto_cluster_score: number;
    simultaneous_actions: number;
    profit_rsquared: number;
    circadian_rhythm_score: number;
    bet_sizing_precision_score: number;
}

interface BeastModeResponse {
    totalPlayersAnalyzed: number;
    suspiciousPlayersFound: number;
    results: BeastModeResult[];
}

const BeastModePage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<BeastModeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const response = await fetch('/api/ultimate-beast-mode-bot-hunter');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The analysis failed due to a server error.');
            }
            const data: BeastModeResponse = await response.json();
            setResults(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
            <div className="container mx-auto p-8">
                {/* Main Analysis Card */}
                <div className="mb-8 rounded-2xl border border-red-900/50 bg-gradient-to-br from-red-950/30 to-gray-900/50 p-8 backdrop-blur-sm shadow-2xl">
                    <div className="flex items-center mb-4">
                        <Zap className="h-10 w-10 text-red-500 mr-4" />
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">
                                ULTIMATE BEAST MODE
                            </h1>
                            <p className="text-gray-400 text-lg mt-1">
                                Advanced AI-powered bot detection. No mercy. No escape.
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={runAnalysis}
                        disabled={isLoading}
                        className={`
                            w-full mt-6 py-4 px-8 rounded-lg font-bold text-xl tracking-wider
                            transition-all duration-300 transform hover:scale-[1.02]
                            ${isLoading 
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-900/50'
                            }
                        `}
                    >
                        {isLoading ? 'ANALYZING...' : 'UNLEASH BEAST MODE'}
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-8 rounded-xl border border-red-500/50 bg-red-950/30 p-6 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-red-400 mb-2">ANALYSIS FAILED</h3>
                        <p className="text-gray-300">{error}</p>
                    </div>
                )}

                {/* Results Display */}
                {results && (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-6 backdrop-blur-sm">
                                <p className="text-gray-400 text-sm uppercase tracking-wider">Total Analyzed</p>
                                <p className="text-3xl font-bold text-white mt-2">{results.totalPlayersAnalyzed}</p>
                            </div>
                            <div className="rounded-xl bg-red-900/20 border border-red-800/50 p-6 backdrop-blur-sm">
                                <p className="text-red-400 text-sm uppercase tracking-wider">Threats Detected</p>
                                <p className="text-3xl font-bold text-red-400 mt-2">{results.suspiciousPlayersFound}</p>
                            </div>
                            <div className="rounded-xl bg-purple-900/20 border border-purple-800/50 p-6 backdrop-blur-sm">
                                <p className="text-purple-400 text-sm uppercase tracking-wider">Detection Rate</p>
                                <p className="text-3xl font-bold text-purple-400 mt-2">
                                    {((results.suspiciousPlayersFound / results.totalPlayersAnalyzed) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden backdrop-blur-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-800 bg-gray-900/80">
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Player</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Risk Level</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">Score</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">Hands</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">GTO Match</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">Profit R²</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">AI Verdict</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {results.results.map((player, idx) => (
                                            <tr key={player.player_name} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-white">
                                                    {player.player_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`
                                                        inline-flex px-3 py-1 text-xs font-bold rounded-full
                                                        ${player.riskLevel === 'CRITICAL_RISK' 
                                                            ? 'bg-red-900/50 text-red-300 border border-red-700' 
                                                            : player.riskLevel === 'HIGH_RISK'
                                                            ? 'bg-orange-900/50 text-orange-300 border border-orange-700'
                                                            : player.riskLevel === 'SUSPICIOUS'
                                                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                                                            : 'bg-green-900/50 text-green-300 border border-green-700'
                                                        }
                                                    `}>
                                                        {player.riskLevel.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-2xl font-bold text-red-400">{player.riskScore}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-300">
                                                    {player.total_hands.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-sm font-medium ${
                                                        player.gto_cluster_score > 50 ? 'text-red-400' : 'text-gray-300'
                                                    }`}>
                                                        {player.gto_cluster_score.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-sm font-medium ${
                                                        player.profit_rsquared > 0.9 ? 'text-red-400' : 'text-gray-300'
                                                    }`}>
                                                        {player.profit_rsquared.toFixed(3)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300 max-w-md">
                                                    <p className="truncate" title={player.gptAnalysis}>
                                                        {player.gptAnalysis}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>Powered by Prometheus Security Analytics</p>
                    <p className="mt-1">Advanced AI-driven bot detection and player analysis</p>
                </div>
            </div>
        </div>
    );
};

export default BeastModePage; 
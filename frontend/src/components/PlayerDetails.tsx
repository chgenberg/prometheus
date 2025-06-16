'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, Target, Shield, BarChart3, Users, Zap, AlertTriangle, ArrowLeft, Clock, Gamepad2, HelpCircle } from 'lucide-react';
import { Line, Scatter } from 'react-chartjs-2';
import PlayerTrendsChart from './PlayerTrendsChart';
import AIAnalysisLoader from './AIAnalysisLoader';
import { analyzePlayerStyle, getCachedPlayerStyle } from '../lib/openaiStyle';
import { PlayerStyle } from '../lib/aiPlayer';
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
import HandHistorySection from './HandHistorySection';
import AIPlayInfoModal from './AIPlayInfoModal';

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

interface PlayerDetailsProps {
  playerName: string;
}

interface PlayerDetailData {
  // Basic stats
  player_name: string;
  total_hands: number;
  net_win_bb: number;
  win_rate_percent: number;
  preflop_vpip: number;
  preflop_pfr: number;
  
  // Aggression stats
  postflop_aggression: number;
  raise_percent: number;
  call_percent: number;
  fold_percent: number;
  
  // AI Scores (crucial for analysis)
  avg_preflop_score: number;
  avg_postflop_score: number;
  
  // Hand strength analysis
  avg_preflop_strength?: number;
  avg_flop_strength?: number;
  avg_turn_strength?: number;
  avg_river_strength?: number;
  
  // Bot detection
  avg_j_score: number;
  intention_score: number;
  collusion_score: number;
  
  // Action types
  action_3bet: number;
  action_2bet: number;
  action_cbet: number;
  action_call: number;
  action_fold: number;
  action_check: number;
  action_bet: number;
  
  // Hand history
  recent_hands: Array<{
    hand_id: string;
    game_id: string;
    played_date: string;
    num_players: number;
    created_ts: string;
    pot_bb: number;
    winners: string;
    board: string;
  }>;
  
  // Chart data
  intention_chart_data: Array<{
    x: number;
    y: number;
    color: string;
    action: string;
  }>;
  
  performance_chart_data: Array<{
    date: string;
    cumulative_bb: number;
    session_bb: number;
  }>;
}

export default function PlayerDetails({ playerName }: PlayerDetailsProps) {
    const [playerData, setPlayerData] = useState<PlayerDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'trends' | 'hands' | 'insights' | 'timing'>('insights');
    
    // AI Analysis states  
    const [showAIInfo, setShowAIInfo] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showAILoader, setShowAILoader] = useState(false);
    const [aiPlayerStyle, setAiPlayerStyle] = useState<any>(null);
    const [showPokerGame, setShowPokerGame] = useState(false);

    const fetchPlayerData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/player-detail/${encodeURIComponent(playerName)}`);
            if (response.ok) {
                const data = await response.json();
                setPlayerData(data);
            } else {
                setPlayerData(null);
            }
        } catch (error) {
            console.error('Error fetching player data:', error);
            setPlayerData(null);
        } finally {
            setLoading(false);
        }
    }, [playerName]);

    useEffect(() => {
        if (playerName) {
            fetchPlayerData();
        }
    }, [playerName, fetchPlayerData]);

    // AI Game Functions
    const handlePlayAgainstAI = async () => {
        // Check if player has enough hands
        if (!playerData || playerData.total_hands < 200) {
                            setAiError(`Player has only ${playerData?.total_hands || 0} hands. Minimum 200 hands required for AI analysis.`);
            return;
        }

        // Check cache first
        const cachedStyle = getCachedPlayerStyle(playerName);
        if (cachedStyle) {
            setAiPlayerStyle(cachedStyle);
            setShowPokerGame(true);
            return;
        }

        // Start AI analysis
        setShowAILoader(true);
        setAiError(null);

        try {
            const style = await analyzePlayerStyle(playerName);
            setAiPlayerStyle(style);
            setShowAILoader(false);
            setShowPokerGame(true);
        } catch (error) {
            console.error('AI analysis failed:', error);
            setAiError(error instanceof Error ? error.message : 'AI-analys misslyckades');
            setShowAILoader(false);
        }
    };

    const handleAILoaderComplete = () => {
        setShowAILoader(false);
        if (aiPlayerStyle) {
            setShowPokerGame(true);
        }
    };

    const handleAILoaderError = (error: string) => {
        setAiError(error);
        setShowAILoader(false);
    };

    const closePokerGame = () => {
        setShowPokerGame(false);
        setAiPlayerStyle(null);
    };
    
    const getScoreColor = (score: number) => {
        if (score > 70) return 'text-red-400';
        if (score > 40) return 'text-yellow-400';
        return 'text-green-400';
    };

            // Analyze player's strengths and weaknesses
    const analyzePlayerProfile = () => {
        if (!playerData) return null;

        const strengths = [];
        const weaknesses = [];
        const insights = [];

        // AI Score Analysis (NEW!)
        if (playerData.avg_preflop_score > 75) {
            strengths.push({
                title: "Excellent Preflop Decisions 🧠",
                description: `AI score: ${playerData.avg_preflop_score}/100 - Elite preflop decision making`,
                score: playerData.avg_preflop_score
            });
        } else if (playerData.avg_preflop_score < 40) {
            weaknesses.push({
                title: "Preflop Decision Errors ⚠️",
                description: `AI score: ${playerData.avg_preflop_score}/100 - Significant preflop leaks`,
                score: playerData.avg_preflop_score
            });
        }

        if (playerData.avg_postflop_score > 75) {
            strengths.push({
                title: "Elite Postflop Play 🎯",
                description: `AI score: ${playerData.avg_postflop_score}/100 - Exceptional postflop decisions`,
                score: playerData.avg_postflop_score
            });
        } else if (playerData.avg_postflop_score < 40) {
            weaknesses.push({
                title: "Postflop Weaknesses 📉",
                description: `AI score: ${playerData.avg_postflop_score}/100 - Needs postflop improvement`,
                score: playerData.avg_postflop_score
            });
        }

        // Hand Strength Analysis
        if (playerData.avg_preflop_strength && playerData.avg_river_strength) {
            const strengthImprovement = playerData.avg_river_strength - playerData.avg_preflop_strength;
            if (strengthImprovement > 20) {
                insights.push({
                    title: "Strong Hand Reading 👁️",
                    description: `Improves hand strength by ${strengthImprovement}% from preflop to river`,
                    value: strengthImprovement
                });
            }
        }

        // Analysera VPIP/PFR ratio
        const vpipPfrRatio = playerData.preflop_pfr / playerData.preflop_vpip;
        if (vpipPfrRatio > 0.7) {
            strengths.push({
                title: "Aggressiv Preflop-stil 🔥",
                description: "Spelar tight och aggressivt - en vinnande kombination!",
                detail: `Med en PFR/VPIP ratio på ${(vpipPfrRatio * 100).toFixed(0)}% visar spelaren stark disciplin.`
            });
        } else if (vpipPfrRatio < 0.4) {
            weaknesses.push({
                title: "Passiv Preflop-stil 😴",
                description: "Callar för ofta istället för att ta initiativet",
                detail: "När spelaren går med i potter tenderar hen att bara calla, vilket gör hen lättläst."
            });
        }

        // Analysera VPIP
        if (playerData.preflop_vpip > 35) {
            weaknesses.push({
                title: "Plays too many hands 🎰",
                description: "VPIP over 35% means the player is too loose",
                detail: "This often leads to difficult postflop decisions with weak hands."
            });
        } else if (playerData.preflop_vpip < 20) {
            strengths.push({
                title: "Tight hand selection 💎",
                description: "Chooses battles wisely",
                detail: "With low VPIP plays only premium hands which provides a solid foundation."
            });
        }

        // Analysera intention score
        if (playerData.intention_score > 70) {
            insights.push({
                title: "High-risk profile detected! ⚠️",
                description: "AI has flagged unusual play patterns",
                detail: "When this player gets strong hands they tend to overbet to maximize value, which can be exploited."
            });
        }

        // Analysera fold frequency
        if (playerData.fold_percent > 60) {
            weaknesses.push({
                title: "Folds too often 🏳️",
                description: "Gives up too easily under pressure",
                detail: "This player can be bluffed effectively, especially on later streets."
            });
        }

        // Analysera aggression
        if (playerData.postflop_aggression < 20) {
            weaknesses.push({
                title: "Passive postflop 🐢",
                description: "Misses value by not betting enough",
                detail: "Tends to check/call with strong hands instead of building pots."
            });
        }

        // Analysera 3bet frequency
        const threeBetFreq = (playerData.action_3bet / playerData.total_hands) * 100;
        if (threeBetFreq < 3) {
            weaknesses.push({
                title: "Rarely 3-bets 📉",
                description: "Misses opportunities to take down pots preflop",
                detail: "With only " + threeBetFreq.toFixed(1) + "% 3-bet frequency can be exploited by opening wide."
            });
        } else if (threeBetFreq > 8) {
            strengths.push({
                title: "Aggressive 3-bettor 🚀",
                description: "Puts pressure on opponents preflop",
                detail: "High 3-bet frequency makes them difficult to play against."
            });
        }

        // Analysera win rate
        if (playerData.win_rate_percent > 0) {
            strengths.push({
                title: "Winning player 💰",
                description: `+${playerData.win_rate_percent.toFixed(1)}% win rate over ${playerData.total_hands} hands`,
                detail: "Consistently winning which indicates solid play strategy."
            });
        } else if (playerData.win_rate_percent < -5) {
            insights.push({
                title: "Losing trend detected 📊",
                description: "Player has lost money over time",
                detail: "This could be due to tilt, poor bankroll management or fundamental strategy flaws."
            });
        }

        // Speciella mönster
        if (playerData.preflop_vpip > 25 && playerData.fold_percent > 65) {
            insights.push({
                title: "Fit-or-fold player 🎯",
                description: "Plays many hands but gives up easily",
                detail: "When this player faces resistance postflop they often fold. Perfect to bluff against!"
            });
        }

        // Check/Call tendenser
        const checkCallRatio = playerData.action_check + playerData.action_call;
        if (checkCallRatio > 70) {
            weaknesses.push({
                title: "Calling station warning! 📞",
                description: "Checks and calls way too much",
                detail: "Don't bluff this player - they will call you down with weak hands."
            });
        }

        return { strengths, weaknesses, insights };
    };

    const playerProfile = analyzePlayerProfile();

    const intentionChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const, labels: { color: '#e5e7eb', font: { size: 12 }, padding: 20 } }, title: { display: true, text: 'Player Intention Profile', color: '#e5e7eb', font: { size: 16, weight: 'bold' as const } }, tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(99, 102, 241, 0.5)', borderWidth: 1, titleColor: '#e5e7eb', bodyColor: '#e5e7eb', padding: 12, cornerRadius: 8, } },
        scales: { x: { title: { display: true, text: 'Bet/Pot (%)', color: '#e5e7eb' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55, 65, 81, 0.5)' } }, y: { title: { display: true, text: 'Strength (1-100)', color: '#e5e7eb' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55, 65, 81, 0.5)' } }, },
    };

    const performanceChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const, labels: { color: '#e5e7eb', font: { size: 12 }, padding: 20 } }, title: { display: true, text: 'Performance Over Time', color: '#e5e7eb', font: { size: 16, weight: 'bold' as const } }, tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(99, 102, 241, 0.5)', borderWidth: 1, titleColor: '#e5e7eb', bodyColor: '#e5e7eb', padding: 12, cornerRadius: 8, } },
        scales: { x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55, 65, 81, 0.5)' } }, y: { title: { display: true, text: 'Cumulative BB', color: '#e5e7eb' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(55, 65, 81, 0.5)' } }, },
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-2xl shadow-2xl border border-gray-700/50 card-hover">
            {/* Header */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 blur-3xl" />
                <div className="relative flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-600 blur-xl opacity-50" />
                            <div className="relative p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                Player Analysis
                            </h2>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xl text-indigo-400 font-bold">{playerName}</span>
                                {playerData && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                            playerData.intention_score > 70 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            playerData.intention_score > 40 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                            'bg-green-500/20 text-green-400 border border-green-500/30'
                                        }`}>
                                            Risk: {playerData.intention_score > 70 ? 'High' : playerData.intention_score > 40 ? 'Medium' : 'Low'}
                                        </span>
                                        <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                            playerData.net_win_bb > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {playerData.net_win_bb > 0 ? '📈 Winner' : '📉 Loser'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* AI Play Button */}
                    <div className="flex items-center gap-4">
                        {playerData && playerData.total_hands >= 200 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePlayAgainstAI}
                                    className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/0 group-hover:from-white/10 group-hover:to-white/10 transition-all" />
                                    <div className="relative flex items-center gap-2">
                                        <Gamepad2 className="w-4 h-4" />
                                        <span>Play Against AI</span>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setShowAIInfo(true)} 
                                    className="group relative w-8 h-8 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-400/50 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-indigo-500/20"
                                >
                                    <HelpCircle className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>
                        )}
                        
                        {playerData && playerData.total_hands < 200 && (
                            <div className="text-center">
                                <div className="px-4 py-2 bg-gray-700/50 text-gray-400 rounded-lg text-sm">
                                    Need {200 - playerData.total_hands} more hands for AI play
                                </div>
                            </div>
                        )}
                        
                                                 {aiError && (
                             <div className="px-4 py-2 bg-red-900/20 text-red-400 rounded-lg text-sm border border-red-500/30">
                                 {aiError}
                             </div>
                         )}
                         
                         <button
                            onClick={() => window.location.href = '/'}
                            className="group flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Back to Overview</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                 {/* Tabs */}
                 <div className="relative mb-8 mt-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 blur-2xl" />
                    <div className="relative flex space-x-2 bg-gray-900/50 rounded-2xl p-2 backdrop-blur-sm border border-gray-700/50">
                    {[
                        { id: 'insights', label: 'Player Insights', icon: Zap, color: 'from-yellow-600 to-orange-600' },
                        { id: 'overview', label: 'Statistics', icon: BarChart3, color: 'from-indigo-600 to-blue-600' },
                        { id: 'charts', label: 'Analytics', icon: TrendingUp, color: 'from-purple-600 to-pink-600' },
                        { id: 'trends', label: 'Performance', icon: Target, color: 'from-orange-600 to-red-600' },
                        { id: 'hands', label: 'Hands', icon: Activity, color: 'from-green-600 to-emerald-600' },
                        { id: 'timing', label: 'Time Patterns', icon: Clock, color: 'from-cyan-600 to-teal-600' }
                    ].map(({ id, label, icon: Icon, color }) => (
                        <button key={id} onClick={() => setActiveTab(id as 'overview' | 'charts' | 'trends' | 'hands' | 'insights' | 'timing')} className={`relative flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl transition-all duration-300 group ${activeTab === id ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                            {activeTab === id && (<div className={`absolute inset-0 bg-gradient-to-r ${color} rounded-xl opacity-90`} />)}
                            <Icon className={`relative w-5 h-5 ${activeTab === id ? 'animate-pulse' : ''}`} />
                            <span className="relative font-medium">{label}</span>
                            {activeTab === id && (<div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full" />)}
                        </button>
                    ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-600 rounded-full blur-2xl opacity-30 animate-pulse" />
                            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-indigo-500"></div>
                        </div>
                        <p className="text-gray-400 animate-pulse">Loading player data...</p>
                    </div>
                ) : playerData ? (
                    <div className="space-y-6">
                        {activeTab === 'insights' && playerProfile && (
                            <div className="space-y-8">
                                {/* Player Profile Header */}
                                <div className="relative text-center space-y-6 py-8">
                                    {/* Background Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 blur-3xl rounded-3xl" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/5 to-transparent rounded-3xl" />
                                    
                                    {/* Main Title */}
                                    <div className="relative">
                                        <h1 className="text-5xl md:text-6xl font-black tracking-wider uppercase bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-2xl">
                                            PLAYER PROFILE: {playerName.split('/')[1]}
                                        </h1>
                                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 blur-xl rounded-lg opacity-50" />
                                    </div>
                                    
                                    {/* Subtitle with enhanced styling */}
                                    <div className="relative">
                                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-600/30 shadow-2xl">
                                            <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse" />
                                            <p className="text-gray-300 text-xl font-semibold tracking-wide">
                                                Based on <span className="text-yellow-400 font-bold">{playerData.total_hands.toLocaleString()}</span> played hands
                                            </p>
                                            <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                                        <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full" />
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                                        <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-full" />
                                    </div>
                                </div>

                                {/* Strengths Section */}
                                {playerProfile.strengths.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                            <Shield className="w-6 h-6" />
                                            Strengths
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {playerProfile.strengths.map((strength, index) => (
                                                <div key={index} className="group relative bg-gradient-to-br from-green-900/20 to-green-800/20 p-6 rounded-2xl border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative">
                                                        <h4 className="text-xl font-bold text-green-400 mb-2">{strength.title}</h4>
                                                        <p className="text-gray-300 mb-3">{strength.description}</p>
                                                        <p className="text-sm text-gray-400 italic">{strength.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Weaknesses Section */}
                                {playerProfile.weaknesses.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-red-400 flex items-center gap-2">
                                            <AlertTriangle className="w-6 h-6" />
                                            Weaknesses to exploit
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {playerProfile.weaknesses.map((weakness, index) => (
                                                <div key={index} className="group relative bg-gradient-to-br from-red-900/20 to-red-800/20 p-6 rounded-2xl border border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:scale-105">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative">
                                                        <h4 className="text-xl font-bold text-red-400 mb-2">{weakness.title}</h4>
                                                        <p className="text-gray-300 mb-3">{weakness.description}</p>
                                                        <p className="text-sm text-gray-400 italic">{weakness.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Insights Section */}
                                {playerProfile.insights.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                                            <Zap className="w-6 h-6" />
                                            AI Insights
                                        </h3>
                                        <div className="space-y-4">
                                            {playerProfile.insights.map((insight, index) => (
                                                <div key={index} className="relative bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-purple-900/20 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
                                                    <div className="absolute top-0 right-0 p-4">
                                                        <div className="animate-pulse">
                                                            <Zap className="w-8 h-8 text-purple-400" />
                                                        </div>
                                                    </div>
                                                    <h4 className="text-xl font-bold text-purple-400 mb-2">{insight.title}</h4>
                                                    <p className="text-gray-300 mb-3">{insight.description}</p>
                                                    <p className="text-sm text-gray-400 italic">{insight.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quick Stats Summary */}
                                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 rounded-3xl border border-gray-700/30">
                                    <h3 className="text-xl font-bold text-white mb-6 text-center">Quick Stats</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-indigo-400">{playerData.preflop_vpip.toFixed(1)}%</div>
                                            <div className="text-sm text-gray-400 mt-1">VPIP</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-purple-400">{playerData.preflop_pfr.toFixed(1)}%</div>
                                            <div className="text-sm text-gray-400 mt-1">PFR</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-green-400">{playerData.total_hands}</div>
                                            <div className="text-sm text-gray-400 mt-1">Hands</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-3xl font-bold ${playerData.net_win_bb > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {playerData.net_win_bb > 0 ? '+' : ''}{playerData.net_win_bb.toFixed(1)} BB
                                            </div>
                                            <div className="text-sm text-gray-400 mt-1">Result</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Basic Statistics */}
                                <div className="stat-card rounded-xl p-6 transition-all duration-300 group">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-white flex items-center">
                                            <div className="p-2 bg-indigo-600/20 rounded-lg mr-3 group-hover:bg-indigo-600/30 transition-colors">
                                                <Target className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            Player Statistics
                                        </h3>
                                        <Zap className="w-4 h-4 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Player', value: playerData.player_name },
                                            { label: 'Total hands', value: playerData.total_hands?.toLocaleString('en-US') || '0' },
                                            { label: 'Net win (BB)', value: playerData.net_win_bb?.toFixed(1) || '0.0' },
                                            { label: 'Win rate %', value: `${playerData.win_rate_percent?.toFixed(1) || '0.0'}%` },
                                            { label: 'VPIP %', value: `${playerData.preflop_vpip?.toFixed(1) || '0.0'}%` },
                                            { label: 'PFR %', value: `${playerData.preflop_pfr?.toFixed(1) || '0.0'}%` },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-700">
                                                <span className="text-gray-400">{label}</span>
                                                <span className="text-white font-medium">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* NEW: AI Scores Section */}
                                <div className="stat-card rounded-xl p-6 transition-all duration-300 group bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-white flex items-center">
                                            <div className="p-2 bg-indigo-600/20 rounded-lg mr-3 group-hover:bg-indigo-600/30 transition-colors">
                                                <Zap className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            AI Performance Scores
                                        </h3>
                                        <div className="px-2 py-1 bg-indigo-500/20 rounded text-xs text-indigo-400 font-medium">
                                            ELITE ANALYSIS
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        {/* Preflop Score */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300 font-medium">Preflop Decision Quality</span>
                                                <span className={`font-bold text-lg ${
                                                    playerData.avg_preflop_score > 75 ? 'text-green-400' :
                                                    playerData.avg_preflop_score > 50 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {playerData.avg_preflop_score?.toFixed(1) || '50.0'}/100
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all duration-1000 ${
                                                    playerData.avg_preflop_score > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                                    playerData.avg_preflop_score > 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 
                                                    'bg-gradient-to-r from-red-500 to-red-400'
                                                }`} style={{ width: `${Math.min(Math.max(playerData.avg_preflop_score || 50, 0), 100)}%` }}/>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {playerData.avg_preflop_score > 75 ? '🧠 Elite preflop decisions' :
                                                 playerData.avg_preflop_score > 50 ? '📊 Above average preflop play' : '⚠️ Significant preflop leaks'}
                                            </div>
                                        </div>
                                        
                                        {/* Postflop Score */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-300 font-medium">Postflop Decision Quality</span>
                                                <span className={`font-bold text-lg ${
                                                    playerData.avg_postflop_score > 75 ? 'text-green-400' :
                                                    playerData.avg_postflop_score > 50 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {playerData.avg_postflop_score?.toFixed(1) || '50.0'}/100
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all duration-1000 ${
                                                    playerData.avg_postflop_score > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                                    playerData.avg_postflop_score > 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 
                                                    'bg-gradient-to-r from-red-500 to-red-400'
                                                }`} style={{ width: `${Math.min(Math.max(playerData.avg_postflop_score || 50, 0), 100)}%` }}/>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {playerData.avg_postflop_score > 75 ? '🎯 Exceptional postflop play' :
                                                 playerData.avg_postflop_score > 50 ? '📈 Solid postflop decisions' : '📉 Postflop weaknesses to exploit'}
                                            </div>
                                        </div>
                                        
                                        {/* Overall AI Rating */}
                                        <div className="pt-4 border-t border-gray-600/30">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white font-semibold">Overall AI Rating</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xl font-black ${
                                                        ((playerData.avg_preflop_score + playerData.avg_postflop_score) / 2) > 75 ? 'text-green-400' :
                                                        ((playerData.avg_preflop_score + playerData.avg_postflop_score) / 2) > 50 ? 'text-yellow-400' : 'text-red-400'
                                                    }`}>
                                                        {(((playerData.avg_preflop_score || 50) + (playerData.avg_postflop_score || 50)) / 2).toFixed(1)}
                                                    </span>
                                                    <div className="text-sm text-gray-400">/100</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="stat-card rounded-xl p-6 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <TrendingUp className="w-5 h-5 mr-2 text-orange-400" />
                                        Aggression
                                    </h3>
                                    <div className="space-y-4">
                                    {[
                                        { label: 'Aggression %', value: playerData.postflop_aggression || 0 },
                                        { label: 'Raise %', value: playerData.raise_percent || 22.4 },
                                        { label: 'Call %', value: playerData.call_percent || 12.5 },
                                        { label: 'Fold %', value: playerData.fold_percent || 49 },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">{label}</span>
                                            <span className="text-white font-medium">{value.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}/>
                                        </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                <div className="stat-card rounded-xl p-6 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <Shield className="w-5 h-5 mr-2 text-red-400" />
                                        Bot Detection
                                    </h3>
                                    <div className="space-y-4">
                                    {[
                                        { label: 'Avg j_score', value: playerData.avg_j_score || 33.6 },
                                        { label: 'Intention score', value: playerData.intention_score || 0 },
                                        { label: 'Collusion score', value: playerData.collusion_score || 0 },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex justify-between items-center py-2 border-b border-gray-700">
                                            <span className="text-gray-400">{label}</span>
                                            <span className={`font-medium ${getScoreColor(value)}`}>{value}</span>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                <div className="stat-card rounded-xl p-6 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <Activity className="w-5 h-5 mr-2 text-green-400" />
                                        Action Types
                                    </h3>
                                    <div className="space-y-4">
                                    {[
                                        { label: '3bet', value: playerData.action_3bet || 0 },
                                        { label: '2bet', value: playerData.action_2bet || 0 },
                                        { label: 'Cont/C-bet', value: playerData.action_cbet || 0 },
                                        { label: 'Call', value: playerData.action_call || 0 },
                                        { label: 'Fold', value: playerData.action_fold || 0 },
                                        { label: 'Check', value: playerData.action_check || 0 },
                                        { label: 'Bet', value: playerData.action_bet || 0 },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">{label}</span>
                                            <span className="text-white font-medium">{value}%</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}/>
                                        </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'charts' && (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-xl p-6 transition-all duration-300 bg-gray-900/50" style={{ height: '450px' }}>
                                    <Scatter data={{ datasets: [{ label: 'Positive Intentions', data: (playerData.intention_chart_data || []).filter(d => d.color === 'green'), backgroundColor: 'rgba(59, 130, 246, 0.6)', }, { label: 'Negative Intentions', data: (playerData.intention_chart_data || []).filter(d => d.color === 'red'), backgroundColor: 'rgba(239, 68, 68, 0.6)', }, { label: 'Neutral Intentions', data: (playerData.intention_chart_data || []).filter(d => d.color === 'gray'), backgroundColor: 'rgba(156, 163, 175, 0.6)', }] }} options={intentionChartOptions} />
                                </div>
                                <div className="rounded-xl p-6 transition-all duration-300 bg-gray-900/50" style={{ height: '450px' }}>
                                    <Line data={{ labels: (playerData.performance_chart_data || []).map(d => d.date), datasets: [{ label: 'Cumulative BB', data: (playerData.performance_chart_data || []).map(d => d.cumulative_bb), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, }] }} options={performanceChartOptions} />
                                </div>
                             </div>
                        )}
                        {activeTab === 'trends' && (
                            <div className="space-y-6">
                                <PlayerTrendsChart playerName={playerName} />
                            </div>
                        )}
                        {activeTab === 'hands' && (
                            <HandHistorySection 
                                playerName={playerName} 
                                hands={playerData.recent_hands || []}
                                totalHands={playerData.total_hands}
                            />
                        )}
                        {activeTab === 'timing' && (
                            <div className="text-center py-12 text-gray-400">
                                <p>Time pattern analysis coming soon...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <p className="text-gray-400">No data available for this player, or player not found.</p>
                    </div>
                )}
            </div>
            
            {/* AI Analysis Loader */}
            {showAILoader && (
                <AIAnalysisLoader
                    playerName={playerName}
                    onComplete={handleAILoaderComplete}
                    onError={handleAILoaderError}
                />
            )}
            
            {/* Poker Game Modal - Coming Soon */}
            {showPokerGame && aiPlayerStyle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <p className="text-white">Poker game coming soon...</p>
                        <button onClick={closePokerGame} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* AI info modal */}
            {showAIInfo && (
                <AIPlayInfoModal onClose={() => setShowAIInfo(false)} />
            )}
        </div>
    );
} 
'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Zap, Target, TrendingUp } from 'lucide-react';

interface AIAnalysisLoaderProps {
  playerName: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export default function AIAnalysisLoader({ playerName, onComplete, onError }: AIAnalysisLoaderProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = [
    { icon: Brain, text: "Hämtar handhistorik...", duration: 2000 },
    { icon: Target, text: "Analyserar spelstil...", duration: 3000 },
    { icon: TrendingUp, text: "Skapar AI-profil...", duration: 2500 },
    { icon: Zap, text: "Förbereder motståndare...", duration: 1500 }
  ];

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let stageTimeout: NodeJS.Timeout;

    const startStage = (stageIndex: number) => {
      if (stageIndex >= stages.length) {
        onComplete();
        return;
      }

      setStage(stageIndex);
      setProgress(0);

      const stageDuration = stages[stageIndex].duration;
      const progressStep = 100 / (stageDuration / 50); // Update every 50ms

      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + progressStep;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 50);

      stageTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        startStage(stageIndex + 1);
      }, stageDuration);
    };

    startStage(0);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout);
    };
  }, [onComplete]);

  const CurrentIcon = stages[stage]?.icon || Brain;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-purple-900/90 p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-lg w-full mx-4 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-70 animate-pulse"></div>
              <div className="relative text-6xl">♠️</div>
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            AI Poker Analysis
          </h2>
          <p className="text-gray-300">
            Analyserar <span className="text-purple-400 font-bold">{playerName}</span>s spelstil
          </p>
        </div>

        {/* Main Animation */}
        <div className="flex flex-col items-center mb-10">
          {/* Rotating Icon with Cards */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 blur-3xl opacity-60 animate-pulse"></div>
            <div className="relative">
              {/* Rotating cards around icon */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl">♥️</div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl">♦️</div>
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-2xl">♣️</div>
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-2xl">♠️</div>
              </div>
              <div className="relative p-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl">
                <CurrentIcon className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>

          {/* Stage Text */}
          <div className="text-center mb-8">
            <p className="text-xl font-bold text-white mb-2">
              {stages[stage]?.text || "Förbereder..."}
            </p>
            <p className="text-sm text-purple-300">
              Steg {stage + 1} av {stages.length}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/30 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-bold">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>

        {/* Fun Facts with better styling */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">AI Insikt</span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">
            {stage === 0 && "🎯 GPT-4o-mini analyserar upp till 500 händer för att förstå spelstilen och identifiera unika mönster..."}
            {stage === 1 && "📊 AI identifierar VPIP, PFR, 3-bet%, aggression och andra viktiga statistiker för att skapa en profil..."}
            {stage === 2 && "🧬 Skapar en unik AI-personlighet baserad på verklig handhistorik och spelarbeteende..."}
            {stage === 3 && "🎮 Din personliga AI-motståndare är nästan redo! Förbereder pokerbord och chips..."}
          </p>
        </div>

        {/* Animated Poker Chips */}
        <div className="flex justify-center mt-8 space-x-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 animate-bounce shadow-lg`}
              style={{ animationDelay: `${i * 0.15}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
} 
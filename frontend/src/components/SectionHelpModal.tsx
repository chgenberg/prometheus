'use client';

import React from 'react';
import { X, Brain, Shield, Activity, Users, BarChart3, Eye, Database, TrendingUp, Target, Zap } from 'lucide-react';

interface SectionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
}

const sectionInfo = {
  'overview': {
    title: 'System Overview',
    icon: <Activity className="w-8 h-8" />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Get a complete overview of system performance and status',
    features: [
      {
        icon: <Database className="w-5 h-5" />,
        title: 'System Status',
        description: 'Real-time monitoring of system health, uptime and performance'
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Quick Statistics',
        description: 'Key metrics including total players, hands and AI scores'
      },
      {
        icon: <Shield className="w-5 h-5" />,
        title: 'Security Overview',
        description: 'Basic security status and threat detection'
      }
    ],
    useCases: [
      'Monitor overall system health',
      'Get quick overview of activity',
      'Track critical system metrics'
    ]
  },
  'security': {
    title: 'Security Analysis',
    icon: <Shield className="w-8 h-8" />,
    color: 'from-red-500 to-orange-500',
    description: 'Advanced security analysis and threat detection for poker players',
    features: [
      {
        icon: <Target className="w-5 h-5" />,
        title: 'Bot Detection',
        description: 'AI-driven analysis to identify automated players'
      },
      {
        icon: <Users className="w-5 h-5" />,
        title: 'Collusion Analysis',
        description: 'Detect suspicious collaboration between players'
      },
      {
        icon: <Activity className="w-5 h-5" />,
        title: 'Behavior Patterns',
        description: 'Analyze unusual play patterns and suspicious activity'
      }
    ],
    useCases: [
      'Identify potential bots or cheaters',
      'Monitor security risks in real-time',
      'Analyze player behavior for anomalies'
    ]
  },
  'ai-performance': {
    title: 'AI Analytics',
    icon: <Brain className="w-8 h-8" />,
    color: 'from-purple-500 to-pink-500',
    description: 'Deep AI analysis of player performance and decision making',
    features: [
      {
        icon: <Brain className="w-5 h-5" />,
        title: 'Preflop Analysis',
        description: 'AI assessment of preflop decisions and hand selection'
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Postflop Performance',
        description: 'Advanced analysis of postflop play and strategies'
      },
      {
        icon: <Target className="w-5 h-5" />,
        title: 'Skill Assessment',
        description: 'AI-driven evaluation of players technical abilities'
      }
    ],
    useCases: [
      'Assess players technical skills',
      'Identify areas for improvement',
      'Compare AI performance between players'
    ]
  },
  'player-analysis': {
    title: 'Player Analytics',
    icon: <Users className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-500',
    description: 'Comprehensive player statistics and performance analysis',
    features: [
      {
        icon: <BarChart3 className="w-5 h-5" />,
        title: 'Player Statistics',
        description: 'VPIP, PFR, aggression and other key poker metrics'
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Win Analysis',
        description: 'Detailed analysis of wins, losses and ROI'
      },
      {
        icon: <Activity className="w-5 h-5" />,
        title: 'Playing Style Profiles',
        description: 'Categorization of player styles (tight, loose, aggressive)'
      }
    ],
    useCases: [
      'Analyze individual player performance',
      'Compare players against each other',
      'Identify winning and losing players'
    ]
  },
  'game-analysis': {
    title: 'Game Analysis',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'from-yellow-500 to-amber-500',
    description: 'Deep analysis of hand history and game patterns',
    features: [
      {
        icon: <Database className="w-5 h-5" />,
        title: 'Hand History',
        description: 'Detailed review of played hands and decisions'
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Win Distribution',
        description: 'Analysis of how wins and losses are distributed'
      },
      {
        icon: <Activity className="w-5 h-5" />,
        title: 'Postflop Analysis',
        description: 'Specialized analysis of flop, turn and river play'
      }
    ],
    useCases: [
      'Review specific hands in detail',
      'Analyze play trends over time',
      'Understand postflop dynamics'
    ]
  },
  'monitoring': {
    title: 'Live Monitoring',
    icon: <Eye className="w-8 h-8" />,
    color: 'from-indigo-500 to-blue-500',
    description: 'Real-time monitoring of activity and alerts',
    features: [
      {
        icon: <Zap className="w-5 h-5" />,
        title: 'Real-time Activity',
        description: 'Live feed of ongoing games and player activity'
      },
      {
        icon: <Shield className="w-5 h-5" />,
        title: 'Security Alerts',
        description: 'Immediate notification of suspicious activity'
      },
      {
        icon: <Activity className="w-5 h-5" />,
        title: 'System Events',
        description: 'Logging and monitoring of system events'
      }
    ],
    useCases: [
      'Monitor ongoing activity in real-time',
      'Get immediate alerts for issues',
      'Track system events and performance'
    ]
  }
};

export default function SectionHelpModal({ isOpen, onClose, sectionId }: SectionHelpModalProps) {
  if (!isOpen) return null;

  const section = sectionInfo[sectionId as keyof typeof sectionInfo];
  if (!section) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative p-8 pb-6">
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-10 rounded-t-3xl`} />
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 bg-gradient-to-br ${section.color} rounded-2xl shadow-lg`}>
                <div className="text-white">
                  {section.icon}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {section.title}
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed">
                  {section.description}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <X className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="px-8 pb-6">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Key Features
            </h3>
          
          <div className="space-y-4">
            {section.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 hover:bg-gray-800/50 transition-all duration-300">
                <div className={`p-3 bg-gradient-to-br ${section.color} rounded-xl shadow-lg flex-shrink-0`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="px-8 pb-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Use Cases
            </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {section.useCases.map((useCase, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-xl border border-gray-700/20">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                <p className="text-gray-300">
                  {useCase}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400 font-semibold">Pro Tips</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Use filtering functions to focus on specific data. 
              All sections update in real-time and can be exported for further analysis. 
              Click on player names for detailed information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
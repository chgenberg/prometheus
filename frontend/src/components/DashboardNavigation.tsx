'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Brain, Activity, Users, BarChart3, Settings, Eye, Sparkles, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import SectionHelpModal from './SectionHelpModal';

interface NavigationTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
  color: string;
  bgGradient: string;
  stats?: { label: string; value: string };
}

interface DashboardNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function DashboardNavigation({ activeTab, onTabChange }: DashboardNavigationProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpSectionId, setHelpSectionId] = useState<string>('');

  const tabs: NavigationTab[] = [
    {
      id: 'overview',
      label: 'System Overview',
      icon: <Activity className="h-5 w-5" />,
      description: 'System status and performance metrics',
      color: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
      stats: { label: 'Uptime', value: '99.9%' }
    },
    {
      id: 'security',
      label: 'Security Analysis',
      icon: <Shield className="h-5 w-5" />,
      description: 'Advanced threat detection and player security',
      badge: 'Live',
      color: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-500/10 to-orange-500/10',
      stats: { label: 'Threats', value: '0' }
    },

    {
      id: 'player-analysis',
      label: 'Player Analytics',
      icon: <Users className="h-5 w-5" />,
      description: 'Player statistics, PROMETHEUS GOD MODE & security analysis',
      badge: 'GOD MODE',
      color: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10',
      stats: { label: 'Active', value: '40' }
    },
    {
      id: 'game-analysis',
      label: 'Game Analysis',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Hand history and game pattern analysis',
      color: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-500/10 to-amber-500/10',
      stats: { label: 'Hands', value: '779' }
    },


  ];

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const openHelpModal = (sectionId: string) => {
    setHelpSectionId(sectionId);
    setHelpModalOpen(true);
  };

  return (
    <div className="relative mb-8">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-3xl animate-pulse" />
      
      <div className="relative bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/50 shadow-2xl">
        {/* Header with animated elements */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-lg opacity-50 animate-pulse" />
              <Sparkles className="relative h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Command Center
              </h2>
              <p className="text-gray-400 text-xs">Navigate your analytics dashboard • Hover over tabs for help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
              <div className="relative">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping absolute" />
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              </div>
              <span className="text-xs text-green-400 font-medium">Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/30">
              <Zap className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Real-time</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {tabs.map((tab, index) => (
                                        <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`
                  relative h-24 rounded-2xl border-2 transition-all duration-500 group overflow-hidden
                  ${activeTab === tab.id
                    ? `bg-gradient-to-br ${tab.bgGradient} border-transparent shadow-2xl scale-105 transform`
                    : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50 hover:scale-105'
                  }
                  ${isAnimating && activeTab === tab.id ? 'animate-pulse' : ''}
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  boxShadow: activeTab === tab.id 
                    ? `0 20px 40px -10px ${tab.color.includes('blue') ? 'rgba(59, 130, 246, 0.3)' : 
                        tab.color.includes('red') ? 'rgba(239, 68, 68, 0.3)' :
                        tab.color.includes('purple') ? 'rgba(168, 85, 247, 0.3)' :
                        tab.color.includes('green') ? 'rgba(34, 197, 94, 0.3)' :
                        tab.color.includes('yellow') ? 'rgba(250, 204, 21, 0.3)' :
                        'rgba(99, 102, 241, 0.3)'}`
                    : 'none'
                }}
              >
              {/* Animated gradient background for active/hovered state */}
              <div className={`
                absolute inset-0 opacity-0 transition-opacity duration-500
                ${activeTab === tab.id || hoveredTab === tab.id ? 'opacity-100' : ''}
              `}>
                <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-10`} />
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <div className={`
                  p-3 rounded-xl transition-all duration-300 mb-2
                  ${activeTab === tab.id
                    ? `bg-gradient-to-br ${tab.color} shadow-lg`
                    : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                  }
                `}>
                  <div className={activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}>
                    {tab.icon}
                  </div>
                </div>
                
                {/* Help icon for each tab */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openHelpModal(tab.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/20 hover:bg-black/40 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer"
                  title={`Help for ${tab.label}`}
                >
                  <HelpCircle className="w-3 h-3 text-gray-300 hover:text-white" />
                </div>

                {tab.badge && (
                  <span className={`
                    absolute top-1.5 left-3 px-1.5 py-0.5 text-[10px] rounded-full font-medium transition-all duration-300
                    ${activeTab === tab.id
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
                

              </div>

              {/* Hover effect */}
              {hoveredTab === tab.id && activeTab !== tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-2xl animate-shimmer" />
              )}
            </button>
          ))}
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <div key={tab.id} className="relative flex-shrink-0">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-300
                    ${activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.bgGradient} border-transparent shadow-lg`
                      : 'bg-gray-800/30 border-gray-700/30 text-gray-300'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-300
                    ${activeTab === tab.id
                      ? `bg-gradient-to-br ${tab.color}`
                      : 'bg-gray-700/50'
                    }
                  `}>
                    <div className={activeTab === tab.id ? 'text-white' : 'text-gray-400'}>
                      {tab.icon}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold whitespace-nowrap ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}>
                        {tab.label}
                      </span>
                      {/* Mobile help icon */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openHelpModal(tab.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
                        title={`Help for ${tab.label}`}
                      >
                        <HelpCircle className="w-3 h-3 text-gray-400 hover:text-white" />
                      </div>
                    </div>
                    {tab.stats && (
                      <span className={`text-xs ${activeTab === tab.id ? 'text-gray-200' : 'text-gray-500'}`}>
                        {tab.stats.label}: {tab.stats.value}
                      </span>
                    )}
                  </div>
                  {tab.badge && (
                    <span className={`
                      px-2 py-1 text-xs rounded-full font-medium ml-2
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-700/50 text-gray-400'
                      }
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Tab Name - Centered below */}
        <div className="mt-6 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Help Modal */}
      <SectionHelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        sectionId={helpSectionId}
      />
    </div>
  );
} 
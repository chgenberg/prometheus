'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Activity, PieChart } from 'lucide-react';
import HandHistorySection from './HandHistorySection';
import HandHistoryGuideModal from './HandHistoryGuideModal';

export default function HandHistorySectionWrapper() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [hands, setHands] = useState([]);

  // Collapse after first client render to avoid hydration mismatch
  useEffect(() => {
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      // Fetch initial data when component expands
      fetch('/api/hand-history?limit=50')
        .then(res => res.json())
        .then(data => {
          setHands(data.hands || []);
          setHandCount(data.stats?.total_hands || 0);
        });
    }
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <div className="mb-8 flex justify-center">
        <div
          onClick={() => setIsExpanded(true)}
          className="group w-full relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/30 p-4 hover:p-6 transition-all duration-500 hover:shadow-2xl hover:border-gray-600/50 cursor-pointer"
        >
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-2 rounded-xl border border-emerald-500/30">
                  <PieChart className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <span className="text-white font-medium text-sm group-hover:text-lg transition-all duration-300">
                Hand History Analysis
              </span>
            </div>
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/30 p-8 mb-8 relative overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-4 rounded-2xl border border-emerald-500/30">
              <PieChart className="h-10 w-10 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Hand History Analysis
              </h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="group p-2 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-110"
                title="Collapse"
              >
                <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-white" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">
                {handCount.toLocaleString('en-US')} hands parsed
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-medium transition-all text-gray-300 hover:text-white border border-gray-600/30"
        >
          <span className="h-4 w-4">
            <PieChart className="h-4 w-4" />
          </span>
          <span>Guide</span>
        </button>
      </div>

      {/* Actual analysis component */}
      <HandHistorySection hands={hands} totalHands={handCount} />

      <HandHistoryGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
} 
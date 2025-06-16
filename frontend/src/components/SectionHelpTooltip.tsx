'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface SectionHelpTooltipProps {
  title: string;
  description: string;
  features?: string[];
}

export default function SectionHelpTooltip({ title, description, features }: SectionHelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="group relative p-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/40 hover:to-purple-500/40 rounded-lg border border-indigo-500/30 hover:border-indigo-400/50 transition-all duration-300 hover:scale-110 active:scale-95"
        title={`Help for ${title}`}
      >
        <HelpCircle className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-lg" />
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-6">
            {/* Arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-800 border-l border-t border-gray-700/50 rotate-45"></div>
            
            {/* Content */}
            <div className="relative">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                {title}
              </h3>
              
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {description}
              </p>

              {features && features.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-indigo-400 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-gray-300">
                        <div className="w-1 h-1 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-700/30">
                <p className="text-xs text-gray-400 italic">
                  Click on data for more details • Updates in real-time
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
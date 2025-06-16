"use client";

import { X } from 'lucide-react';

interface AIPlayInfoModalProps {
  onClose: () => void;
}

export default function AIPlayInfoModal({ onClose }: AIPlayInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 border border-indigo-500/40 rounded-3xl p-8 max-w-lg w-full text-gray-300 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-pink-600/10 rounded-3xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all duration-200 hover:scale-110"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="relative mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">🤖</span>
            </div>
                         <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
               How does "Play Against AI" work?
             </h2>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-xs font-bold">1</span>
            </div>
                         <p className="text-gray-300 leading-relaxed">
               A minimum of <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-lg">200 hands</span> is required to build a reliable player profile.
             </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-xs font-bold">2</span>
            </div>
                         <p className="text-gray-300 leading-relaxed">
               Hand history is analyzed by a <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-lg">GPT-4o</span> model that identifies VPIP, PFR, aggression, bet sizes, and timing patterns.
             </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-xs font-bold">3</span>
            </div>
                         <p className="text-gray-300 leading-relaxed">
               The result is a <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-lg">uniquely trained AI opponent</span> that mimics the player's style in real-time.
             </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-xs font-bold">4</span>
            </div>
                         <p className="text-gray-300 leading-relaxed">
               The goal is to let you <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-lg">practice, test strategies and find weaknesses</span> against a simulation of the real player – without financial risk.
             </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-400 text-xs font-bold">5</span>
            </div>
                         <p className="text-gray-300 leading-relaxed">
               The AI opponent is updated every 24 hours or when new hand data becomes available.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-8 pt-6 border-t border-gray-700/50">
          <div className="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-4">
                         <p className="text-sm text-gray-400 text-center leading-relaxed">
               💡 Don't hesitate to give feedback – this feature is experimental and continuously improving!
             </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
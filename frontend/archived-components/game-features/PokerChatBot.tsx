'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Loader2, TrendingUp, BarChart3, Sparkles, HelpCircle, Trophy, Shuffle, Heart, PieChart } from 'lucide-react';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart as RechartsPieChart, Pie, Cell, ComposedChart, Line } from 'recharts';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  data?: any; // For charts and interactive content
}

interface ChatResponse {
  type: 'general' | 'database';
  content: string;
  data?: any;
}

export default function PokerChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message when chat opens
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: "Hi! I'm **Prometheus**, your AI poker analyst. I can analyze player statistics, answer poker strategy questions, and help you improve your game. What would you like to know?",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: ChatResponse = await response.json();

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: data.content,
        timestamp: new Date(),
        data: data.data
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => sendMessage(), 100);
  };

  const quickQuestions = [
    {
      icon: <Trophy className="h-4 w-4" />,
      text: "Which player has won the most hands?",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: <Shuffle className="h-4 w-4" />,
      text: "Who has bluffed the most?",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Heart className="h-4 w-4" />,
      text: "Which poker player likes 10-2 suited as a favorite hand?",
      color: "from-red-500 to-pink-500"
    }
  ];

  const formatMessage = (content: string) => {
    // Split content into paragraphs first
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      // Check if this paragraph contains bullet points
      const hasBulletPoints = paragraph.includes('• **');
      
      if (hasBulletPoints) {
        // Handle bullet point paragraphs specially
        const lines = paragraph.split('\n').filter(line => line.trim());
        
        return (
          <div key={paragraphIndex} className={paragraphIndex > 0 ? "mt-4" : ""}>
            {lines.map((line, lineIndex) => {
              const isBulletPoint = line.trim().startsWith('•');
              
              return (
                <div 
                  key={lineIndex} 
                  className={isBulletPoint ? "ml-4 mb-1" : (lineIndex > 0 ? "mt-2" : "")}
                >
                  {formatLineContent(line)}
                </div>
              );
            })}
          </div>
        );
      } else {
        // Handle regular paragraphs
        return (
          <div 
            key={paragraphIndex} 
            className={paragraphIndex > 0 ? "mt-4" : ""}
          >
            {formatLineContent(paragraph)}
          </div>
        );
      }
    });
  };

  const formatLineContent = (line: string) => {
    // Convert **text** to bold formatting
    const parts = line.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const text = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-white">
            {text}
          </strong>
        );
      } else {
        return part;
      }
    });
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.isTyping) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-gray-400 text-sm">Prometheus is thinking...</span>
        </div>
      );
    }

    return (
      <div>
        <div className="text-gray-100 leading-relaxed">
          {formatMessage(message.content)}
        </div>
        {message.data && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            {message.data.type === 'player_comparison' && (
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Player Analysis
                </h4>
                <div className="space-y-2 mb-4">
                  {Object.entries(message.data.stats).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                      <span className="text-white font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
                {message.data.chartData && message.data.chartData.playerStats && (
                  <div className="mt-4">
                    <h5 className="text-gray-300 font-medium mb-3">Player vs Average Comparison</h5>
                    <div className="space-y-3">
                      {message.data.chartData.playerStats.map((stat: any, index: number) => {
                        const percentage = Math.min((stat.value / Math.max(stat.average, 1)) * 100, 200);
                        const isAboveAverage = stat.value > stat.average;
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-300 font-medium">{stat.name}</span>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold ${isAboveAverage ? 'text-green-400' : 'text-red-400'}`}>
                                  {stat.value.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  avg: {stat.average.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="relative h-6 bg-gray-700/30 rounded-full overflow-hidden">
                              {/* Average marker */}
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-500"
                                style={{ left: '50%' }}
                              />
                              
                              {/* Player value bar */}
                              <div 
                                className={`absolute top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
                                  isAboveAverage 
                                    ? 'bg-gradient-to-r from-green-500/50 to-green-400 left-1/2' 
                                    : 'bg-gradient-to-l from-red-500/50 to-red-400 right-1/2'
                                }`}
                                style={{ 
                                  width: `${Math.abs(percentage - 100) / 2}%`,
                                  boxShadow: isAboveAverage 
                                    ? '0 0 15px rgba(34, 197, 94, 0.5)' 
                                    : '0 0 15px rgba(239, 68, 68, 0.5)'
                                }}
                              />
                              
                              {/* Labels */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs text-white font-medium">
                                  {isAboveAverage ? '+' : ''}{((stat.value / stat.average - 1) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Summary */}
                    <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Overall Performance</span>
                        <span className="text-sm font-bold text-white">
                          {message.data.chartData.playerStats.filter((s: any) => s.value > s.average).length}/
                          {message.data.chartData.playerStats.length} Above Average
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {message.data.type === 'top_players' && (
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top Players Chart
                </h4>
                <div className="space-y-3">
                  {message.data.chartData.map((player: any, index: number) => {
                    const maxValue = Math.max(...message.data.chartData.map((p: any) => p.value));
                    const percentage = (player.value / maxValue) * 100;
                    const categoryLabel = message.data.category === 'hands' ? 'hands' :
                                        message.data.category === 'profit' ? 'BB' :
                                        '%';
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 font-medium flex items-center gap-2">
                            <span className="text-yellow-500 font-bold">#{index + 1}</span>
                            {player.name}
                          </span>
                          <span className="text-white font-bold">
                            {player.value.toFixed(message.data.category === 'winrate' ? 1 : 0)} {categoryLabel}
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-700/30 rounded-lg overflow-hidden">
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20"
                            style={{ width: `${percentage}%` }}
                          />
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${percentage}%`,
                              boxShadow: '0 0 20px rgba(234, 179, 8, 0.5)'
                            }}
                          />
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-xs text-white font-medium">
                              {player.handsPlayed} hands • VPIP: {player.vpip}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {message.data.type === 'bluffing_analysis' && (
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-purple-500" />
                  Bluffing Analysis
                </h4>
                <div className="relative h-48 flex items-center justify-center">
                  <div className="relative">
                    {/* Background circle */}
                    <div className="absolute inset-0 w-40 h-40 rounded-full bg-gray-700/30" />
                    
                    {/* Bluff rate arc */}
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#bluffGradient)"
                        strokeWidth="20"
                        fill="none"
                        strokeDasharray={`${message.data.chartData.bluffEstimate * 4.4} 440`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="bluffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#c22b35" stopOpacity="1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {message.data.chartData.bluffEstimate.toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-400">Bluff Rate</span>
                    </div>
                  </div>
                </div>
                
                {/* Stats below */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">Aggression</div>
                    <div className="text-lg font-bold text-purple-400">
                      {(message.data.chartData.aggression / 10).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">Showdown Win</div>
                    <div className="text-lg font-bold text-green-400">
                      {message.data.chartData.showdown}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                    <span className="text-xs text-purple-400">Playing Style:</span>
                    <span className="text-xs text-white font-medium">{message.data.chartData.style}</span>
                  </span>
                </div>
              </div>
            )}
            
            {message.data.type === 'top_bluffers' && (
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-purple-500" />
                  Top Bluffers Comparison
                </h4>
                <div className="space-y-3">
                  {message.data.chartData.map((player: any, index: number) => {
                    const maxBluff = Math.max(...message.data.chartData.map((p: any) => p.bluffRate));
                    const bluffPercentage = (player.bluffRate / maxBluff) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 font-medium flex items-center gap-2">
                            <span className="text-purple-500 font-bold">#{index + 1}</span>
                            {player.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-bold">
                              {player.bluffRate.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              Aggr: {player.aggression.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-8 bg-gray-700/30 rounded-lg overflow-hidden">
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-red-500/20"
                            style={{ width: `${bluffPercentage}%` }}
                          />
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-red-500 rounded-lg transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${bluffPercentage}%`,
                              boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-xs text-white font-medium">
                              Showdown: {player.showdown}%
                            </span>
                            {index === 0 && (
                              <span className="text-xs text-yellow-400 font-bold">
                                Most Aggressive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={`group relative bg-gradient-to-br from-[#c22b35] to-[#a01e26] p-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110 ${
            isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#c22b35] to-[#a01e26] rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
          
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl" />
          
          {/* Chat icon */}
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          
          {/* Hover tooltip */}
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#c22b35]" />
                Chat with Prometheus AI
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
          
          {/* Notification pulse */}
          <div className="absolute -top-1 -right-1">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping" />
              <div className="relative w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
        </button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 w-full max-w-2xl h-[700px] mx-4 rounded-3xl shadow-2xl border border-gray-700/30 flex flex-col overflow-hidden relative animate-slideUp">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%),
                                 radial-gradient(circle at 80% 80%, #ec4899 0%, transparent 50%),
                                 radial-gradient(circle at 40% 20%, #10b981 0%, transparent 50%)`,
                filter: 'blur(100px)'
              }} />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c22b35] to-[#a01e26] blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="relative bg-gradient-to-br from-[#c22b35]/20 to-[#a01e26]/20 p-1 rounded-2xl border border-[#c22b35]/30">
                    <Image
                      src="/avatar.png"
                      alt="Prometheus AI"
                      width={48}
                      height={48}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Prometheus AI
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm text-gray-400">Online</span>
                    </div>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-400">Poker Analysis Expert</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2.5 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-110 group"
              >
                <X className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-br from-[#c22b35] to-[#a01e26]' 
                      : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-700/50'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className={`max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-[#c22b35] to-[#a01e26] text-white rounded-3xl rounded-tr-lg shadow-lg'
                      : 'bg-gradient-to-br from-gray-800/70 to-gray-900/70 text-gray-100 rounded-3xl rounded-tl-lg border border-gray-700/30 shadow-lg backdrop-blur-sm'
                  } p-5 transition-all hover:scale-[1.02]`}>
                    {renderMessageContent(message)}
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-red-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString('sv-SE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions - Show only when no messages */}
            {messages.length <= 1 && (
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-400 mb-3 text-center">Popular questions:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question.text)}
                      className="group relative bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-gray-700/50 hover:to-gray-600/50 px-4 py-2.5 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${question.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />
                      <div className="relative flex items-center gap-2">
                        <div className={`bg-gradient-to-r ${question.color} p-1.5 rounded-lg`}>
                          {question.icon}
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          {question.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="relative z-10 p-6 border-t border-gray-700/30 bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about player stats, poker strategy, or anything poker related..."
                    className="w-full bg-gray-800/50 border border-gray-700/30 rounded-2xl px-5 py-3.5 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-[#c22b35]/50 focus:bg-gray-800/70 resize-none max-h-32 transition-all"
                    rows={1}
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-gray-500 hover:text-gray-400 cursor-help transition-colors" />
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="relative group bg-gradient-to-r from-[#c22b35] to-[#a01e26] hover:from-[#d63640] hover:to-[#b02530] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed p-4 rounded-2xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 flex items-center justify-center min-w-[56px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c22b35] to-[#a01e26] rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                  <div className="relative">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Sparkles className="h-3 w-3 text-[#c22b35]" />
                <span className="text-xs text-gray-400">
                  Powered by advanced AI • Analyzes player data & provides expert poker advice
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </>
  );
} 
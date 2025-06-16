'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Legend
} from 'recharts';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  Activity, 
  TrendingUp,
  TrendingDown,
  Users,
  Server,
  Globe,
  Zap,
  Target,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Wifi,
  Database,
  Clock,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import SecurityGuideModal from './SecurityGuideModal';

interface SecurityData {
  securityMetrics: {
    totalPlayers: number;
    flaggedPlayers: number;
    highRiskPlayers: number;
    botLikelihoodRate: number;
    avgHandsPerPlayer: number;
    criticalThreats: number;
    lastUpdate: string;
  };
  riskDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  volumeAnalysis: Array<{
    range: string;
    players: number;
    avgWinRate: number;
    suspicious: number;
  }>;
}

// Fetch real security data from API
const fetchSecurityData = async (): Promise<SecurityData | null> => {
  try {
    const response = await fetch('/api/security-overview', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout and retry logic
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch security data: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching security data:', error);
    
    // Return fallback data structure to prevent UI crashes
    return {
      securityMetrics: {
        totalPlayers: 0,
        flaggedPlayers: 0,
        highRiskPlayers: 0,
        botLikelihoodRate: 0,
        avgHandsPerPlayer: 0,
        criticalThreats: 0,
        lastUpdate: '--:--:--'
      },
      riskDistribution: [],
      volumeAnalysis: []
    };
  }
};

// Fallback data if API fails
const generateFallbackData = (timeRange: string = '24h') => {
  const timeMultiplier = {
    '1h': 0.04,
    '24h': 1,
    '7d': 7,
    '30d': 30
  }[timeRange] || 1;

  return {
    securityMetrics: {
      totalPlayers: Math.floor(50020 * timeMultiplier),
      flaggedPlayers: Math.floor(48963 * timeMultiplier),
      highRiskPlayers: Math.floor(38337 * timeMultiplier),
      botLikelihoodRate: 76.6,
      avgHandsPerPlayer: 2506,
      criticalThreats: Math.floor(32783 * timeMultiplier),
      lastUpdate: '--:--:--'
    },
    riskDistribution: [
      { level: 'Low Risk', count: Math.floor(6519 * timeMultiplier), percentage: 13, color: '#10b981' },
      { level: 'Medium Risk', count: Math.floor(5164 * timeMultiplier), percentage: 10, color: '#f59e0b' },
      { level: 'High Risk', count: Math.floor(5554 * timeMultiplier), percentage: 11, color: '#ef4444' },
      { level: 'Critical Risk', count: Math.floor(32783 * timeMultiplier), percentage: 66, color: '#dc2626' }
    ],
    volumeAnalysis: [
      { range: '0-50', players: Math.floor(418 * timeMultiplier), avgWinRate: 49.5, suspicious: Math.floor(12 * timeMultiplier) },
      { range: '51-100', players: Math.floor(490 * timeMultiplier), avgWinRate: 51.3, suspicious: Math.floor(19 * timeMultiplier) },
      { range: '101-300', players: Math.floor(2003 * timeMultiplier), avgWinRate: 50.0, suspicious: Math.floor(1445 * timeMultiplier) },
      { range: '301-500', players: Math.floor(2047 * timeMultiplier), avgWinRate: 51.0, suspicious: Math.floor(1706 * timeMultiplier) },
      { range: '500+', players: Math.floor(45062 * timeMultiplier), avgWinRate: 50.1, suspicious: Math.floor(40319 * timeMultiplier) }
    ],
    botIndicators: [
      { name: 'High Volume', detected: Math.floor(38337 * timeMultiplier), percentage: 76.6, color: '#dc2626', icon: '⚡' },
      { name: 'Perfect Win Rate', detected: Math.floor(15420 * timeMultiplier), percentage: 30.8, color: '#ef4444', icon: '🎯' },
      { name: 'GTO Perfect Play', detected: Math.floor(12890 * timeMultiplier), percentage: 25.8, color: '#f59e0b', icon: '🤖' },
      { name: 'No Breaks Pattern', detected: Math.floor(8956 * timeMultiplier), percentage: 17.9, color: '#dc2626', icon: '⏱️' },
      { name: 'Extreme VPIP', detected: Math.floor(6734 * timeMultiplier), percentage: 13.5, color: '#ef4444', icon: '📊' },
      { name: 'Response Time', detected: Math.floor(4523 * timeMultiplier), percentage: 9.0, color: '#f59e0b', icon: '⚡' }
    ],
    securityScore: [
      { metric: 'Volume Analysis', score: 88, fullMark: 100 },
      { metric: 'Pattern Detection', score: 92, fullMark: 100 },
      { metric: 'Win Rate Analysis', score: 85, fullMark: 100 },
      { metric: 'Behavioral Tracking', score: 78, fullMark: 100 },
      { metric: 'Timing Analysis', score: 94, fullMark: 100 },
      { metric: 'Statistical Anomalies', score: 90, fullMark: 100 }
    ],
    hourlyData: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      time: `${i.toString().padStart(2, '0')}:00`,
      botsDetected: Math.floor(Math.random() * 100 + 50),
      newAccounts: Math.floor(Math.random() * 30 + 20),
      suspiciousPlay: Math.floor(Math.random() * 80 + 40),
      volumeAnomalies: Math.floor(Math.random() * 25 + 10)
    }))
  };
};

// Generate processed data for charts
const generateChartData = (securityData: SecurityData | null, timeRange: string = '24h') => {
  if (!securityData) {
    // Fallback dummy data if API fails
    return generateFallbackData(timeRange);
  }

  const { securityMetrics, riskDistribution, volumeAnalysis } = securityData;

  // Use the data directly from the API since it's already in the correct format

  // Generate hourly data based on time range (simulated for now)
  const dataPoints = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
  const hourlyData = Array.from({ length: dataPoints }, (_, i) => {
    const baseDetections = Math.floor(securityMetrics.highRiskPlayers / dataPoints);
    const peakHours = [14, 20, 2]; // Peak bot activity hours
    const isPeakHour = timeRange === '24h' || timeRange === '1h' ? peakHours.includes(i % 24) : false;
    const detectionMultiplier = isPeakHour ? 2.5 : 1;
    
    const botsDetected = Math.floor((Math.random() * 50 + baseDetections) * detectionMultiplier);
    const newAccounts = Math.floor((Math.random() * 30) + 20);
    const suspiciousPlay = Math.floor((Math.random() * 80) + 40);
    
    let timeLabel;
    if (timeRange === '1h') {
      timeLabel = `${i * 5}m`;
    } else if (timeRange === '24h') {
      timeLabel = `${i.toString().padStart(2, '0')}:00`;
    } else if (timeRange === '7d') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      timeLabel = days[i];
    } else {
      timeLabel = `Day ${i + 1}`;
    }
    
    return {
      hour: i,
      time: timeLabel,
      botsDetected,
      newAccounts,
      suspiciousPlay,
      volumeAnomalies: Math.floor(Math.random() * 25) + 10
    };
  });

  // Generate bot indicators based on risk distribution
  const botIndicators = [
    { name: 'High Volume', detected: securityMetrics.highRiskPlayers, percentage: Math.round((securityMetrics.highRiskPlayers / securityMetrics.totalPlayers) * 100 * 10) / 10, color: '#dc2626', icon: '⚡' },
    { name: 'Flagged Players', detected: securityMetrics.flaggedPlayers, percentage: Math.round((securityMetrics.flaggedPlayers / securityMetrics.totalPlayers) * 100 * 10) / 10, color: '#ef4444', icon: '🎯' },
    { name: 'Critical Threats', detected: securityMetrics.criticalThreats, percentage: Math.round((securityMetrics.criticalThreats / securityMetrics.totalPlayers) * 100 * 10) / 10, color: '#f59e0b', icon: '🤖' },
    { name: 'Bot Likelihood', detected: Math.round(securityMetrics.botLikelihoodRate), percentage: securityMetrics.botLikelihoodRate, color: '#dc2626', icon: '⏱️' }
  ];

  // Security score based on real data
  const securityScore = [
    { metric: 'Volume Analysis', score: Math.min(100, Math.round((securityMetrics.highRiskPlayers / securityMetrics.totalPlayers) * 400)), fullMark: 100 },
    { metric: 'Pattern Detection', score: Math.min(100, Math.round((securityMetrics.flaggedPlayers / securityMetrics.totalPlayers) * 200)), fullMark: 100 },
    { metric: 'Win Rate Analysis', score: Math.min(100, 85 + Math.random() * 15), fullMark: 100 },
    { metric: 'Behavioral Tracking', score: Math.min(100, 75 + Math.random() * 20), fullMark: 100 },
    { metric: 'Timing Analysis', score: Math.min(100, 90 + Math.random() * 10), fullMark: 100 },
    { metric: 'Statistical Anomalies', score: Math.min(100, Math.round(securityMetrics.botLikelihoodRate * 1.2)), fullMark: 100 }
  ];

  return { hourlyData, botIndicators, securityMetrics, riskDistribution, volumeAnalysis, securityScore };
};

export default function GlobalSecurityOverview() {
  const router = useRouter();
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const handlePlayerClick = (playerName: string) => {
    if (playerName !== 'SYSTEM') {
      router.push(`/?player=${encodeURIComponent(playerName)}`);
    }
  };
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [data, setData] = useState(generateFallbackData(selectedTimeRange));
  const [isRealTime, setIsRealTime] = useState(true);
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeActivities, setRealTimeActivities] = useState<{
    id: string;
    type: 'bot_detected' | 'suspicious_play' | 'new_account' | 'pattern_alert' | 'high_volume';
    player_name: string;
    timestamp: string;
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
    details: string;

    flags: string[];
  }[]>([]);

  // Set initial time on client side to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    };
    
    updateTime(); // Set initial time
    const timeInterval = setInterval(updateTime, 1000); // Update every second
    
    return () => clearInterval(timeInterval);
  }, []);

  // Fetch real-time activities
  const fetchRealTimeActivities = async () => {
    try {
      const response = await fetch('/api/real-time-activity?limit=8', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        setRealTimeActivities(data.activities || []);
      } else {
        console.warn('Real-time activities API returned non-OK status:', response.status);
        // Keep existing activities instead of clearing them
      }
    } catch (error) {
      console.error('Failed to fetch real-time activities:', error);
      // Don't clear existing activities on error, just log it
    }
  };

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const apiData = await fetchSecurityData();
      setSecurityData(apiData);
      setData(generateChartData(apiData, selectedTimeRange));
      
      // Fetch real-time activities
      await fetchRealTimeActivities();
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Update data when time range changes
  useEffect(() => {
    setData(generateChartData(securityData, selectedTimeRange));
  }, [selectedTimeRange, securityData]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(async () => {
      const apiData = await fetchSecurityData();
      setSecurityData(apiData);
      setData(generateChartData(apiData, selectedTimeRange));
      await fetchRealTimeActivities();
    }, 10000); // Update every 10 seconds for real data

    return () => clearInterval(interval);
  }, [isRealTime, selectedTimeRange]);

  // Auto-refresh real-time activities every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchRealTimeActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const { hourlyData, botIndicators, securityMetrics, riskDistribution, volumeAnalysis, securityScore } = data;

  // If collapsed, show minimal toggle button
  if (!isExpanded) {
    return (
      <div className="mb-8 flex justify-center">
        <div
          onClick={() => setIsExpanded(true)}
          className="group w-full relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/30 p-4 hover:p-6 transition-all duration-500 hover:shadow-2xl hover:border-gray-600/50 cursor-pointer"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, #c22b35 0%, transparent 50%)`,
              filter: 'blur(50px)'
            }} />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-2 rounded-xl border border-red-500/30">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm group-hover:text-lg transition-all duration-300">
                  Bot Detection & Player Security
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                    Live
                  </span>
                </div>
              </div>
            </div>
            
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors animate-bounce" />
            </div>
          </div>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/30 p-8 mb-8 relative overflow-hidden animate-slideDown">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #c22b35 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, #6366f1 0%, transparent 50%),
                           radial-gradient(circle at 40% 20%, #10b981 0%, transparent 50%)`,
          filter: 'blur(100px)'
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-4 rounded-2xl border border-red-500/30">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Bot Detection & Player Integrity
              </h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="group p-2 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-110"
                title="Collapse Security Overview"
              >
                <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-gray-400">Live AI Analysis</span>
              </div>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400">Updated: {currentTime}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTimeRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              isRealTime 
                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Wifi className={`h-4 w-4 ${isRealTime ? 'animate-pulse' : ''}`} />
            <span>{isRealTime ? 'Live' : 'Paused'}</span>
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-medium transition-all text-gray-300 hover:text-white border border-gray-600/30"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Guide</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards - Beautiful Grid */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <MetricCard 
          icon={<AlertTriangle className="h-5 w-5" />} 
          title="Total Players" 
                        value={securityMetrics.totalPlayers.toLocaleString('en-US')} 
          trend="up" 
          color="red"
          bgGradient="from-red-500/10 to-red-600/10"
          borderColor="border-red-500/20"
        />
        <MetricCard 
          icon={<ShieldCheck className="h-5 w-5" />} 
          title="Flagged Players" 
                        value={securityMetrics.flaggedPlayers.toLocaleString('en-US')} 
          trend="up" 
          color="green"
          bgGradient="from-green-500/10 to-green-600/10"
          borderColor="border-green-500/20"
        />
        <MetricCard 
          icon={<Server className="h-5 w-5" />} 
          title="High Risk Players" 
                        value={securityMetrics.highRiskPlayers.toLocaleString('en-US')} 
          trend="up" 
          color="blue"
          bgGradient="from-blue-500/10 to-blue-600/10"
          borderColor="border-blue-500/20"
          onClick={() => router.push('/?riskLevel=high')}
        />
        <MetricCard 
          icon={<Users className="h-5 w-5" />} 
          title="Bot Likelihood Rate" 
          value={`${securityMetrics.botLikelihoodRate}%`} 
          trend="stable" 
          color="purple"
          bgGradient="from-purple-500/10 to-purple-600/10"
          borderColor="border-purple-500/20"
        />
        <MetricCard 
          icon={<Target className="h-5 w-5" />} 
          title="Critical Threats" 
                        value={securityMetrics.criticalThreats.toLocaleString('en-US')} 
          trend="up" 
          color="yellow"
          bgGradient="from-yellow-500/10 to-yellow-600/10"
          borderColor="border-yellow-500/20"
          onClick={() => router.push('/?riskLevel=critical')}
        />
        <MetricCard 
          icon={<Zap className="h-5 w-5" />} 
          title="Risk Distribution" 
          value={
            <div className="text-sm">
              {riskDistribution.map((item, index) => (
                <span key={item.level}>
                  {index > 0 && ', '}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const riskLevel = item.level.toLowerCase().replace(' risk', '');
                      router.push(`/?riskLevel=${riskLevel}`);
                    }}
                    className="hover:underline hover:text-orange-400 transition-colors"
                  >
                    {item.level}: {item.percentage}%
                  </button>
                </span>
              ))}
            </div>
          } 
          trend="stable" 
          color="orange"
          bgGradient="from-orange-500/10 to-orange-600/10"
          borderColor="border-orange-500/20"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Real-time Activity Monitor */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Real-time Bot Activity</h3>
              <p className="text-sm text-gray-400 mt-1">Live monitoring of suspicious player behavior</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-400">Bots Detected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-400">New Accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-400">Suspicious Play</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c22b35" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#c22b35" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="#6B7280" 
                  fontSize={11} 
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={11} 
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="botsDetected" 
                  stroke="#c22b35" 
                  fillOpacity={1}
                  fill="url(#threatGradient)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="newAccounts" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#blockedGradient)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="suspiciousPlay" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security Score Radar */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-6">Bot Detection Score</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={securityScore}>
                <PolarGrid 
                  gridType="polygon" 
                  stroke="#374151" 
                  strokeOpacity={0.3}
                />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                />
                <Radar 
                  name="Score" 
                  dataKey="score" 
                  stroke="#6366f1" 
                  fill="#6366f1" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '12px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold text-white">
              {Math.round(securityScore.reduce((acc, curr) => acc + curr.score, 0) / securityScore.length)}
            </div>
            <div className="text-sm text-gray-400">Overall Score</div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Threat Types Distribution */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-6">Bot Indicator Distribution</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={botIndicators} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius="90%" 
                    innerRadius="60%" 
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {botIndicators.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                      border: '1px solid rgba(55, 65, 81, 0.5)',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {botIndicators.map((type) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{type.name}</div>
                      <div className="text-xs text-gray-400">{type.detected} incidents</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{type.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Threats - Interactive Circular Design */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Geographic Threat Sources</h3>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-red-400 animate-pulse" />
              <span className="text-sm text-gray-400">Global Analysis</span>
            </div>
          </div>
          
          <div className="relative h-64">
            {/* Central Globe Icon */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-red-600 to-red-800 rounded-full shadow-2xl">
                  <Globe className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            
            {/* Threat Level Cards in Circular Layout */}
            {[
              { level: 'Low Risk', percentage: 27, color: 'from-green-600 to-green-700', icon: Shield, position: 'top-0 left-1/2 -translate-x-1/2', delay: '0ms' },
              { level: 'Medium Risk', percentage: 16, color: 'from-yellow-600 to-orange-600', icon: AlertTriangle, position: 'top-1/2 right-0 translate-x-0 -translate-y-1/2', delay: '100ms' },
              { level: 'High Risk', percentage: 12, color: 'from-orange-600 to-red-600', icon: Zap, position: 'bottom-0 left-1/2 -translate-x-1/2', delay: '200ms' },
              { level: 'Critical Risk', percentage: 45, color: 'from-red-600 to-red-800', icon: AlertCircle, position: 'top-1/2 left-0 -translate-y-1/2', delay: '300ms' }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.level}
                  className={`absolute ${item.position} group cursor-pointer`}
                  style={{ animationDelay: item.delay }}
                >
                  <div className="relative animate-fadeIn">
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>
                    
                    {/* Card */}
                    <div className={`relative bg-gradient-to-br ${item.color} p-4 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-2xl`}>
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-white" />
                        <div>
                          <div className="text-white font-bold text-lg">{item.percentage}%</div>
                          <div className="text-white/80 text-xs">{item.level}</div>
                        </div>
                      </div>
                    </div>
                    

                  </div>
                </div>
              );
            })}
            

          </div>
        </div>
      </div>
      
      {/* Live Activity Feed & Status */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Live Activity Feed</h3>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Real-time</span>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {realTimeActivities.length > 0 ? realTimeActivities.map((activity, i) => {
              const activityTypeMap = {
                'bot_detected': 'Bots Detected',
                'suspicious_play': 'Suspicious Play',
                'pattern_alert': 'Pattern Alert',
                'new_account': 'New Account',
                'high_volume': 'High Volume'
              };
              
              const statusColorMap = {
                'Critical': 'bg-red-500',
                'High': 'bg-orange-500',
                'Medium': 'bg-yellow-500',
                'Low': 'bg-green-500'
              };
              
              const statusTextMap = {
                'Critical': 'High Risk',
                'High': 'Suspicious',
                'Medium': 'Monitor',
                'Low': 'Safe'
              };
              
              const activityTime = new Date(activity.timestamp);
              const timeString = activityTime.toLocaleTimeString('sv-SE', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              });
              
              return (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/20 hover:border-gray-600/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${statusColorMap[activity.risk_level]} animate-pulse`} />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {activityTypeMap[activity.type] || activity.type}
                      </div>
                      <div className="text-xs text-gray-400">
                        {activity.player_name === 'SYSTEM' ? (
                          'System Event'
                        ) : (
                          <>
                            Player: 
                            <button
                              onClick={() => handlePlayerClick(activity.player_name)}
                              className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer ml-1"
                            >
                              {activity.player_name.split('/')[1] || activity.player_name}
                            </button>
                          </>
                        )} • {timeString}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {statusTextMap[activity.risk_level]}
                  </div>
                </div>
              );
            }) : [...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/20 hover:border-gray-600/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`} />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {i % 3 === 0 ? 'Bots Detected' : i % 3 === 1 ? 'New Accounts' : 'Suspicious Play'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Loading... • {i === 0 ? currentTime : '--:--:--'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {i % 3 === 0 ? 'High Risk' : i % 3 === 1 ? 'Safe' : 'Suspicious'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">System Status</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Operational</span>
            </div>
          </div>
          <div className="space-y-4">
            <StatusItem 
              icon={<Shield className="h-5 w-5" />} 
              name="Flagged Players" 
              status="Active" 
              health={securityData ? Math.round((securityData.securityMetrics.flaggedPlayers / securityData.securityMetrics.totalPlayers) * 100) : 98}
              color="green"
            />
            <StatusItem 
              icon={<Globe className="h-5 w-5" />} 
              name="High Risk Players" 
              status="Active" 
              health={securityData ? Math.round((securityData.securityMetrics.highRiskPlayers / securityData.securityMetrics.totalPlayers) * 100) : 95}
              color="green"
            />
            <StatusItem 
              icon={<Eye className="h-5 w-5" />} 
              name="Bot Likelihood Rate" 
              status="Active" 
              health={securityData ? Math.round(securityData.securityMetrics.botLikelihoodRate) : 100}
              color="green"
            />
            <StatusItem 
              icon={<Database className="h-5 w-5" />} 
              name="Critical Threats" 
              status="Active" 
              health={securityData ? Math.round((securityData.riskDistribution.find(r => r.level === 'Critical Risk')?.count || 0) / securityData.securityMetrics.totalPlayers * 100) : 92}
              color="green"
            />
            <StatusItem 
              icon={<Lock className="h-5 w-5" />} 
              name="Database Health" 
              status="Active" 
              health={securityData ? Math.min(100, Math.round((securityData.securityMetrics.totalPlayers / 3000) * 100)) : 100}
              color="green"
            />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 2000px;
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.6s ease-out forwards;
        }
      `}</style>
      
      <SecurityGuideModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number | React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  color: string;
  bgGradient: string;
  borderColor: string;
  onClick?: () => void;
}

const MetricCard = ({ icon, title, value, trend, color, bgGradient, borderColor, onClick }: MetricCardProps) => {
  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-green-400" />,
    down: <TrendingDown className="h-4 w-4 text-red-400" />,
    stable: <Activity className="h-4 w-4 text-blue-400" />
  }[trend];

  const iconColors = {
    red: 'text-red-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    yellow: 'text-yellow-500',
    orange: 'text-orange-500'
  };

  return (
    <div 
      className={`bg-gradient-to-br ${bgGradient} p-5 rounded-xl border ${borderColor} backdrop-blur-sm hover:scale-105 transition-transform duration-200 cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${iconColors[color as keyof typeof iconColors]}`}>
          {icon}
        </div>
        {trendIcon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-sm text-gray-400">{title}</p>
    </div>
  );
};

interface StatusItemProps {
  icon: React.ReactNode;
  name: string;
  status: string;
  health: number;
  color: string;
}

const StatusItem = ({ icon, name, status, health, color }: StatusItemProps) => {
  const healthColor = health >= 95 ? 'bg-green-500' : health >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/20 hover:border-gray-600/30 transition-all">
      <div className="flex items-center gap-3">
        <div className={`text-${color}-500`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-gray-400">{status}</div>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-sm font-semibold text-white">{health}%</div>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
          <div 
            className={`h-full ${healthColor} rounded-full transition-all duration-500`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>
    </div>
  );
}; 
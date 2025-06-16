import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { openDb, getCachedQuery, setCachedQuery, getPlayerStatsOptimized, batchPlayerLookup, PlayerStat } from '../../../lib/database-unified';
import { getPlayerStatsQuery, getPlayerSearchQuery, getPlayerAveragesQuery, getPlayerRankQuery } from '../../../lib/database-migration';

// Initialize OpenAI with environment variable or fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting configuration
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Performance monitoring
interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
}

const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  cacheHitRate: 0,
  errorRate: 0
};

let cacheHits = 0;
let cacheMisses = 0;
let totalResponseTime = 0;
let errorCount = 0;

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  type: 'general' | 'database';
  content: string;
  data?: any;
}

// Add interface for player averages
interface PlayerAverages {
  avg_win_rate: number;
  avg_vpip: number;
  avg_pfr: number;
  avg_aggression: number;
  avg_showdown: number;
}

// Interface for player stats result with cache info
interface PlayerStatsResult {
  player: PlayerStat;
  averages: PlayerAverages;
  rankInfo: Record<string, unknown>;
  comparison: {
    win_rate_vs_avg: number;
    vpip_vs_avg: number;
    pfr_vs_avg: number;
    aggression_vs_avg: number;
    showdown_vs_avg: number;
  };
  fromCache?: boolean;
}

// Enhanced function to determine if the question is about database/player analysis
function isDataQuery(message: string): boolean {
  const messageLower = message.toLowerCase();
  
  // Fast path: obvious database questions should go straight to database
  const databaseQuestions = [
    'which player', 'who has', 'who won', 'most hands', 'best player', 'worst player',
    'top player', 'leading player', 'highest', 'lowest', 'most', 'least',
    'player stats', 'player statistics', 'compare player', 'analyze player',
    'coinpoker/', 'hands played', 'win rate', 'net win', 'profit', 'loss',
    // Swedish equivalents
    'vilken spelare', 'vem har', 'vem vann', 'flest händer', 'bästa spelaren', 'sämsta spelaren',
    'främsta spelaren', 'högsta', 'lägsta', 'mest', 'minst', 'jämför spelare',
    'analysera spelare', 'spelarstatistik', 'vinst', 'förlust'
  ];
  
  // Check if message contains obvious database query terms
  if (databaseQuestions.some(term => messageLower.includes(term))) {
    return true;
  }
  
  // Fast path: obvious general poker questions should go straight to GPT
  const generalPokerQuestions = [
    'how do i play poker', 'how to play poker', 'poker rules', 'poker basics',
    'what is poker', 'poker strategy', 'how to win at poker', 'poker tips',
    'poker hands', 'poker betting', 'basic strategy', 'poker theory',
    'how to bluff', 'when to fold', 'position play', 'pot odds',
    'range construction', 'gto', 'game theory', 'mental game',
    // Swedish equivalents
    'hur spelar man poker', 'pokerregler', 'pokergrunder', 'vad är poker',
    'pokerstrategi', 'pokertips', 'grundläggande strategi', 'pokerteori',
    'hur bluffar man', 'när ska man folda', 'positionsspel'
  ];
  
  if (generalPokerQuestions.some(question => messageLower.includes(question))) {
    return false; // It's a general poker question, not a data query
  }
  
  // Enhanced pattern matching for player identifiers with typo tolerance
  const playerPatterns = [
    // Standard patterns
    /\bcoinpoker[-_]?\d+/i,
    /\bplayer[-_]?\d+/i,
    /\buser[-_]?\d+/i,
    // Common typos and variations
    /\bcoin[-_]?poker[-_]?\d+/i,
    /\bcoinepoker[-_]?\d+/i,
    /\bcoinpokr[-_]?\d+/i,
    /\bconpoker[-_]?\d+/i,
    /\bcoinpocker[-_]?\d+/i,
    // Swedish variations
    /\bspelare[-_]?\d+/i,
    /\banvändare[-_]?\d+/i
  ];
  
  // Check for player patterns
  if (playerPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Enhanced comparison detection with fuzzy matching
  const comparisonPatterns = [
    // English
    /\b(compare|versus|vs|against|compared?\s+to|relative\s+to)\b/i,
    /\b(better\s+than|worse\s+than|more\s+than|less\s+than)\b/i,
    /\b(how\s+does\s+\w+\s+(compare|stack\s+up|measure))\b/i,
    /\b(\w+\s+(mot|vs|versus|against)\s+\w+)\b/i,
    // Swedish
    /\b(jämför|jämfört\s+med|mot|kontra|bättre\s+än|sämre\s+än)\b/i,
    /\b(hur\s+står\s+sig|hur\s+mäter\s+sig|i\s+förhållande\s+till)\b/i,
    /\b(ställer\s+sig\s+mot|står\s+mot)\b/i
  ];
  
  if (comparisonPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Enhanced statistical query detection
  const statisticalPatterns = [
    // English
    /\b(how\s+many|how\s+much|what\s+percentage|frequency|rate)\b/i,
    /\b(statistics|stats|data|analyze|analysis|performance|metrics)\b/i,
    /\b(win\s+rate|hands\s+played|net\s+win|profit|loss|bb\/100)\b/i,
    /\b(vpip|pfr|aggression|showdown|preflop|postflop)\b/i,
    /\b(bluff|bluffing|tight|loose|aggressive|passive)\b/i,
    /\b(who\s+has\s+the|which\s+player\s+has|top\s+\d+|best\s+at|worst\s+at)\b/i,
    // Swedish
    /\b(hur\s+många|hur\s+mycket|vilken\s+procent|frekvens)\b/i,
    /\b(statistik|data|analysera|analys|prestanda|mätvärden)\b/i,
    /\b(vinstprocent|händer\s+spelade|nettovinst|vinst|förlust)\b/i,
    /\b(vem\s+har\s+mest|vilken\s+spelare\s+har|topp\s+\d+|bäst\s+på|sämst\s+på)\b/i,
    /\b(antal\s+vunna\s+händer|vunna\s+händer|händer\s+vunna)\b/i
  ];
  
  if (statisticalPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  // Check for database/player-specific keywords with higher confidence
  const dataKeywords = [
    // Player identification
    'player', 'coinpoker', 'coin-', 'user-', 'username', 'spelare', 'användare',
    
    // Comparison keywords
    'compare', 'versus', 'vs', 'against', 'compared to', 'relative to',
    'better than', 'worse than', 'average', 'mean', 'median',
    'jämför', 'mot', 'kontra', 'bättre än', 'sämre än', 'genomsnitt',
    
    // Statistical terms
    'statistics', 'stats', 'data', 'analyze', 'analysis', 'performance',
    'results', 'metrics', 'numbers', 'database', 'records',
    'statistik', 'data', 'analysera', 'analys', 'prestanda', 'resultat',
    
    // Poker-specific stats
    'win rate', 'winrate', 'hands played', 'net win', 'bb/100',
    'vpip', 'pfr', 'aggression', 'showdown', 'preflop', 'postflop',
    'vinstprocent', 'händer spelade', 'nettovinst',
    
    // Behavioral analysis
    'bluff', 'bluffing', 'tight', 'loose', 'aggressive', 'passive',
    'calling station', 'nit', 'maniac', 'style', 'tendency',
    'bluffa', 'bluffar', 'tight', 'lös', 'aggressiv', 'passiv', 'stil',
    
    // Questions about specific players
    'how often does', 'how much', 'what percentage', 'frequency',
    'who has', 'which player', 'best player', 'worst player',
    'top player', 'leading', 'highest', 'lowest', 'most', 'least',
    'hur ofta', 'hur mycket', 'vilken procent', 'vem har', 'vilken spelare',
    'bästa spelaren', 'sämsta spelaren', 'främsta spelaren', 'högsta', 'lägsta'
  ];
  
  // Give higher weight to questions that mention specific players or comparisons
  const playerMentioned = /\b(coin|player|user|spelare|användare)[\w\-\d]+/i.test(message);
  const comparisonMentioned = /\b(compare|versus|vs|against|better|worse|average|jämför|mot|bättre|sämre|genomsnitt)\b/i.test(messageLower);
  
  if (playerMentioned || comparisonMentioned) {
    return true;
  }
  
  // Enhanced keyword matching with fuzzy logic
  const keywordMatches = dataKeywords.filter(keyword => messageLower.includes(keyword)).length;
  
  // If we have multiple keyword matches, it's likely a database query
  if (keywordMatches >= 2) {
    return true;
  }
  
  // Special case: Questions about specific numbers or quantities
  const quantityPatterns = [
    /\b\d+\s*(händer|hands|games|spel)\b/i,
    /\b(antal|number\s+of|count\s+of)\b/i,
    /\b(totalt|total|sum|summa)\b/i
  ];
  
  if (quantityPatterns.some(pattern => pattern.test(message))) {
    return true;
  }
  
  return keywordMatches > 0;
}

// Enhanced function to extract player name from query with typo tolerance
function extractPlayerName(message: string): string | null {
  const patterns = [
    // Standard CoinPoker patterns with typo tolerance
    /\b(coinpoker|coin-poker|coinepoker|coinpokr|conpoker|coinpocker)[-_]?(\d+)\b/gi,
    /\b(player|spelare)[-_]?(\d+)\b/gi,
    /\b(user|användare)[-_]?(\d+)\b/gi,
    
    // Quoted player names
    /["']([^"']*(?:coin|player|spelare|användare)[^"']*)["']/gi,
    
    // Player names in context
    /(?:player|spelare|användare)\s+["']?([^"'\s]+?)["']?(?:\s|$)/gi,
    /(?:mot|versus|vs|against)\s+["']?([^"'\s]+?)["']?(?:\s|$)/gi,
    
    // Any alphanumeric identifier that looks like a player name
    /\b([A-Za-z0-9_-]*(?:coin|player|spelare)[A-Za-z0-9_-]*)\b/gi,
    
    // Fallback: any word with numbers that might be a player ID
    /\b([A-Za-z]+\d+|[A-Za-z]*\d+[A-Za-z]*)\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(message.matchAll(pattern));
    for (const match of matches) {
      // For patterns with capture groups, use the captured group
      const playerName = match[2] ? `${match[1]}-${match[2]}` : (match[1] || match[0]);
      
      // Clean up the player name
      const cleanName = playerName.trim().replace(/^["']|["']$/g, '');
      
      // Skip very short or generic matches
      if (cleanName.length < 3 || /^(the|and|or|in|on|at|to|for|of|with|by)$/i.test(cleanName)) {
        continue;
      }
      
      // Normalize common typos
      const normalizedName = cleanName
        .replace(/coinepoker/gi, 'coinpoker')
        .replace(/coinpokr/gi, 'coinpoker')
        .replace(/conpoker/gi, 'coinpoker')
        .replace(/coinpocker/gi, 'coinpoker')
        .replace(/coin-poker/gi, 'coinpoker')
        .replace(/spelare/gi, 'player')
        .replace(/användare/gi, 'user');
      
      return normalizedName;
    }
  }
  
  return null;
}

// Function to handle special queries like favorite hands
async function getSpecialQuery(message: string) {
  try {
    const db = await openDb();
    const messageLower = message.toLowerCase();
    
    // Check for 10-2 suited query
    if (messageLower.includes('10') && messageLower.includes('2') && messageLower.includes('suited')) {
      // This is a fun easter egg query - return a humorous response
      const { query, params } = getPlayerStatsQuery(undefined, 50);
      const randomPlayers = await db.all(`
        ${query}
        WHERE COALESCE(vp.hands, m.total_hands, 0) >= ?
        ORDER BY RANDOM()
        LIMIT 3
      `, [50]);
      
      return {
        type: 'special',
        content: `**Nobody likes 10-2 suited as a favorite hand!** 😄 It's one of the worst starting hands in poker, often called "The Doyle Brunson" ironically (since he won two WSOP Main Events with it).

**However, here are some players who might be brave enough to play it:**

${randomPlayers.map((player, index) => 
  `**${index + 1}. ${player.player_name}**
  - Hands Played: ${player.hands_played.toLocaleString()}
  - Win Rate: ${player.win_rate_percent}%
  - Courage Level: ${Math.random() > 0.5 ? 'High' : 'Moderate'} 🎲`
).join('\n\n')}

**Pro Tip:** 10-2 suited has only about 12% equity against a random hand. It's best to fold this hand in almost all situations unless you're in the big blind and can see a free flop!`,
        data: {
          type: 'fun_fact',
          handEquity: 12,
          players: randomPlayers
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Special query error:', error);
    return null;
  }
}

// Optimized function to get comprehensive player statistics with caching
async function getPlayerStats(playerName: string): Promise<PlayerStatsResult | null> {
  const cacheKey = `player_stats_${playerName.toLowerCase()}`;
  
  // Check cache first
  const cached = getCachedQuery(cacheKey) as PlayerStatsResult | null;
  if (cached) {
    cacheHits++;
    return { ...cached, fromCache: true };
  }
  
  cacheMisses++;
  
  try {
    const db = await openDb();
    
    // Use optimized query function
    const player = await getPlayerStatsOptimized(playerName);
    
    if (!player) {
      return null;
    }
    
    // Get average stats for comparison (cache this separately as it's expensive)
    const avgCacheKey = 'player_averages';
    let averages = getCachedQuery(avgCacheKey) as PlayerAverages | null;
    
    if (!averages) {
      const { query: avgQuery, params: avgParams } = getPlayerAveragesQuery(100);
      averages = await db.get(avgQuery, avgParams) as PlayerAverages;
      
      // Cache averages for 10 minutes (they don't change often)
      setCachedQuery(avgCacheKey, averages, 10 * 60 * 1000);
    }
    
    // Get rank information
    const { query: rankQuery, params: rankParams } = getPlayerRankQuery(playerName, player.win_rate_percent, 100);
    const rankInfo = await db.get(rankQuery, rankParams) as Record<string, unknown>;
    
    const result: PlayerStatsResult = {
      player,
      averages,
      rankInfo,
      comparison: {
        win_rate_vs_avg: player.win_rate_percent - averages.avg_win_rate,
        vpip_vs_avg: (player.preflop_vpip ?? 0) - averages.avg_vpip,
        pfr_vs_avg: (player.preflop_pfr ?? 0) - averages.avg_pfr,
        aggression_vs_avg: (player.postflop_aggression ?? 0) - averages.avg_aggression,
        showdown_vs_avg: (player.showdown_win_percent ?? 0) - averages.avg_showdown
      }
    };
    
    // Cache the result for 2 minutes (balance between freshness and performance)
    setCachedQuery(cacheKey, result, 2 * 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Function to get top players by category
async function getTopPlayers(category: string, limit: number = 5) {
  try {
    const db = await openDb();
    let orderByType: 'hands' | 'winrate' | 'profit' = 'winrate';
    let minHands = 50;
    
    switch (category) {
      case 'hands':
        orderByType = 'hands';
        break;
      case 'profit':
        orderByType = 'profit';
        break;
      case 'winrate':
      default:
        orderByType = 'winrate';
        minHands = 100; // Higher minimum for win rate
        break;
    }
    
    const { query, params } = getPlayerStatsQuery(undefined, minHands, orderByType, limit);
    const players = await db.all(query, params);
    return players;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Function to analyze bluffing tendencies (approximate based on aggression and showdown stats)
async function getBluffingAnalysis(playerName?: string) {
  try {
    const db = await openDb();
    
    if (playerName) {
      // Get specific player's bluffing tendency
      const { query, params } = getPlayerSearchQuery(playerName, 1);
      const player = await db.get(query, params);
      
      if (!player) return null;
      
      // Calculate bluff estimation based on aggression vs showdown win rate
      const bluffEstimate = Math.max(0, player.postflop_aggression * 10 - player.showdown_win_percent);
      
      return {
        player,
        bluffEstimate: Math.min(bluffEstimate, 100), // Cap at 100%
        analysis: {
          aggression: player.postflop_aggression,
          showdown: player.showdown_win_percent,
          style: bluffEstimate > 25 ? 'Aggressive Bluffer' : 
                 bluffEstimate > 15 ? 'Moderate Bluffer' : 'Conservative Player'
        }
      };
    } else {
      // Get top bluffers
      const { query, params } = getPlayerStatsQuery(undefined, 100);
      const allPlayers = await db.all(query, params);
      
      // Calculate bluff estimates and sort
      const topBluffers = allPlayers
        .map(player => ({
          ...player,
          bluff_estimate: Math.max(0, player.postflop_aggression * 10 - player.showdown_win_percent)
        }))
        .sort((a, b) => b.bluff_estimate - a.bluff_estimate)
        .slice(0, 10);
      
      return { topBluffers };
    }
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Function to generate database analysis response
async function generateDatabaseResponse(message: string, playerData: any): Promise<string> {
  const { player, averages, comparison } = playerData;
  
  // Fallback response if OpenAI is not available
  if (!openai) {
    return `Based on the data for **${player.player_name}**, they've played **${player.hands_played}** hands with a **${player.win_rate_percent}%** win rate, which is ${comparison.win_rate_vs_avg > 0 ? 'above' : 'below'} the average of **${averages.avg_win_rate.toFixed(1)}%**. Their VPIP of **${player.preflop_vpip}%** and PFR of **${player.preflop_pfr}%** suggest ${player.preflop_vpip > 25 ? 'a loose' : 'a tight'} playing style. With ${player.net_win_bb > 0 ? 'positive' : 'negative'} results of **${player.net_win_bb} BB**, there's ${comparison.win_rate_vs_avg > 0 ? 'strong potential for continued success' : 'room for improvement in their strategy'}.`;
  }
  
  const prompt = `You are Prometheus, an expert poker analyst. Analyze this player data and provide insights in a professional, engaging way. 

FORMATTING REQUIREMENTS:
- Use **text** for bold formatting (not markdown)
- Separate different topics with double line breaks (\n\n) for clear paragraphs
- Use bullet points with • for lists
- Structure your response with clear sections like "Performance Analysis:", "Playing Style:", "Recommendations:"
- Write in clear, well-separated paragraphs
- Use up to 600 tokens if needed for complete analysis
- Always finish sentences completely

Player: ${player.player_name}
Hands Played: ${player.hands_played}
Win Rate: ${player.win_rate_percent}% (Average: ${averages.avg_win_rate.toFixed(1)}%)
Net Win: ${player.net_win_chips} chips (${player.net_win_bb} BB)
VPIP: ${player.preflop_vpip}% (Average: ${averages.avg_vpip.toFixed(1)}%)
PFR: ${player.preflop_pfr}% (Average: ${averages.avg_pfr.toFixed(1)}%)
Aggression: ${player.postflop_aggression} (Average: ${averages.avg_aggression.toFixed(1)})
Showdown Win: ${player.showdown_win_percent}% (Average: ${averages.avg_showdown.toFixed(1)}%)

Comparison to average:
- Win Rate: ${comparison.win_rate_vs_avg > 0 ? '+' : ''}${comparison.win_rate_vs_avg.toFixed(1)}%
- VPIP: ${comparison.vpip_vs_avg > 0 ? '+' : ''}${comparison.vpip_vs_avg.toFixed(1)}%
- PFR: ${comparison.pfr_vs_avg > 0 ? '+' : ''}${comparison.pfr_vs_avg.toFixed(1)}%

User question: ${message}

Provide a comprehensive analysis focusing on the player's strengths and areas for improvement.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Prometheus, an expert poker analyst and coach. Provide detailed, professional poker analysis. IMPORTANT FORMATTING: Use **text** for bold formatting, separate different topics with double line breaks (\\n\\n) for clear paragraphs, use bullet points with • for lists, and structure responses with clear sections. Always complete your sentences and provide actionable insights. Write in a confident, knowledgeable tone like a poker professional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "I couldn't analyze that player data right now.";
  } catch (error) {
    console.error('OpenAI error:', error);
    return `Based on the data for **${player.player_name}**, they've played **${player.hands_played}** hands with a **${player.win_rate_percent}%** win rate, which is ${comparison.win_rate_vs_avg > 0 ? 'above' : 'below'} the average of **${averages.avg_win_rate.toFixed(1)}%**. Their VPIP of **${player.preflop_vpip}%** and PFR of **${player.preflop_pfr}%** suggest ${player.preflop_vpip > 25 ? 'a loose' : 'a tight'} playing style. With ${player.net_win_bb > 0 ? 'positive' : 'negative'} results of **${player.net_win_bb} BB**, there's ${comparison.win_rate_vs_avg > 0 ? 'strong potential for continued success' : 'room for improvement in their strategy'}.`;
  }
}

// Function to get general poker advice from OpenAI
async function getGeneralPokerAdvice(message: string): Promise<string> {
  // Fallback response if OpenAI is not available
  if (!openai) {
    return "I'm currently running in offline mode. While I can analyze player data from the database, I need an OpenAI API key to provide detailed poker strategy advice. You can still ask me about specific players or statistics from the database!";
  }
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Prometheus, a world-class poker expert and coach with decades of experience. You have deep knowledge of:
          - Texas Hold'em strategy (cash games, tournaments, heads-up)
          - Game theory optimal (GTO) play
          - Exploitative strategies
          - Mental game and bankroll management
          - Reading opponents and table dynamics
          - Hand analysis and range construction
          - Poker mathematics and odds
          - Live and online poker differences
          
          IMPORTANT FORMATTING REQUIREMENTS:
          - Use **text** for bold formatting (not markdown)
          - Separate different topics with double line breaks (\\n\\n) for clear paragraphs
          - Use bullet points with • for lists
          - Structure responses with clear sections like "Key Concepts:", "Strategy Tips:", "Implementation:"
          - Write in clear, well-separated paragraphs
          - Always complete your sentences fully
          - Use up to 600 tokens if needed for complete explanations
          - Emphasize key concepts in bold`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "I'd be happy to help with your poker question, but I'm having trouble processing it right now. Please try rephrasing your question.";
  } catch (error) {
    console.error('OpenAI error:', error);
    return "I'm having trouble connecting to my knowledge base right now. Please check that your OpenAI API key is configured correctly and try again.";
  }
}

// Enhanced query analysis function
function analyzeQuery(message: string) {
  const messageLower = message.toLowerCase();
  
  // Check for different types of queries
  const queryTypes = {
    specificPlayer: /\b(coin|player|user)[\w\-\d]+/i.test(message),
    topPlayers: /\b(who|which player|top|best|worst|leading|highest|lowest|most|least)\b/i.test(messageLower),
    bluffing: /\b(bluff|bluffing|bluffs)\b/i.test(messageLower),
    comparison: /\b(compare|versus|vs|against|compared to)\b/i.test(messageLower),
    ranking: /\b(rank|ranking|position|place)\b/i.test(messageLower),
    hands: /\b(hands|most hands|hand count)\b/i.test(messageLower),
    winRate: /\b(win rate|winrate|winning)\b/i.test(messageLower),
    profit: /\b(profit|chips|money|earn|net win)\b/i.test(messageLower)
  };
  
  return queryTypes;
}

// Function to compare two players
async function comparePlayersStats(player1Name: string, player2Name: string) {
  try {
    const db = await openDb();
    
    // Get both players' stats
    const { query: query1, params: params1 } = getPlayerSearchQuery(player1Name, 1);
    const player1 = await db.get(query1, params1);
    
    const { query: query2, params: params2 } = getPlayerSearchQuery(player2Name, 1);
    const player2 = await db.get(query2, params2);
    
    if (!player1 || !player2) {
      return null;
    }
    
    // Calculate differences
    const comparison = {
      hands_played_diff: player1.hands_played - player2.hands_played,
      win_rate_diff: player1.win_rate_percent - player2.win_rate_percent,
      net_win_diff: player1.net_win_bb - player2.net_win_bb,
      vpip_diff: player1.preflop_vpip - player2.preflop_vpip,
      pfr_diff: player1.preflop_pfr - player2.preflop_pfr,
      aggression_diff: player1.postflop_aggression - player2.postflop_aggression,
      showdown_diff: player1.showdown_win_percent - player2.showdown_win_percent
    };
    
    return {
      player1,
      player2,
      comparison
    };
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Enhanced function to extract multiple player names from comparison queries

function extractPlayerNames(message: string): string[] {
  const players: string[] = [];
  
  // Enhanced patterns for multiple players
  const patterns = [
    // Standard CoinPoker patterns with typo tolerance
    /\b(coinpoker|coin-poker|coinepoker|coinpokr|conpoker|coinpocker)[-_]?(\d+)\b/gi,
    /\b(player|spelare)[-_]?(\d+)\b/gi,
    /\b(user|användare)[-_]?(\d+)\b/gi,
    
    // Quoted player names
    /["']([^"']*(?:coin|player|spelare|användare)[^"']*)["']/gi,
    
    // Any alphanumeric identifier that looks like a player name
    /\b([A-Za-z0-9_-]*(?:coin|player|spelare)[A-Za-z0-9_-]*)\b/gi,
    
    // Fallback: any word with numbers that might be a player ID
    /\b([A-Za-z]+\d+|[A-Za-z]*\d+[A-Za-z]*)\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(message.matchAll(pattern));
    for (const match of matches) {
      // For patterns with capture groups, use the captured group
      const playerName = match[2] ? `${match[1]}-${match[2]}` : (match[1] || match[0]);
      
      // Clean up the player name
      const cleanName = playerName.trim().replace(/^["']|["']$/g, '');
      
      // Skip very short or generic matches
      if (cleanName.length < 3 || /^(the|and|or|in|on|at|to|for|of|with|by|mot|och|eller|i|på|till|för|av|med)$/i.test(cleanName)) {
        continue;
      }
      
      // Normalize common typos
      const normalizedName = cleanName
        .replace(/coinepoker/gi, 'coinpoker')
        .replace(/coinpokr/gi, 'coinpoker')
        .replace(/conpoker/gi, 'coinpoker')
        .replace(/coinpocker/gi, 'coinpoker')
        .replace(/coin-poker/gi, 'coinpoker')
        .replace(/spelare/gi, 'player')
        .replace(/användare/gi, 'user');
      
      // Avoid duplicates
      if (!players.some(p => p.toLowerCase() === normalizedName.toLowerCase())) {
        players.push(normalizedName);
      }
    }
  }
  
  return players.slice(0, 2); // Return max 2 players for comparison
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  performanceMetrics.totalRequests++;
  
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before making another request.',
          type: 'rate_limit'
        },
        { status: 429 }
      );
    }

    const { message }: ChatRequest = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Log request for monitoring
    console.log(`[${new Date().toISOString()}] Query from ${clientIP}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    let response: ChatResponse;
    let cachedResult = false; // Track if we used cached data

    // Check for special queries first
    const specialQuery = await getSpecialQuery(message);
    if (specialQuery) {
      response = {
        type: 'database',
        content: specialQuery.content,
        data: specialQuery.data
      };
    }
    // Determine if this is a data query or general poker question
    else if (isDataQuery(message)) {
      const queryTypes = analyzeQuery(message);
      
      // Handle different types of database queries
      if (queryTypes.bluffing) {
        // Bluffing analysis
        const playerName = extractPlayerName(message);
        
        if (playerName) {
          const bluffingData = await getBluffingAnalysis(playerName);
          if (bluffingData && bluffingData.analysis && typeof bluffingData.bluffEstimate === 'number') {
            const content = `**${bluffingData.player.player_name}** shows a **${bluffingData.analysis.style}** profile with an estimated bluff frequency of **${bluffingData.bluffEstimate.toFixed(1)}%**.

**Detailed Analysis:**

• **Postflop Aggression:** ${(bluffingData.player.postflop_aggression ?? 0).toFixed(1)} (higher = more aggressive)
• **Showdown Win Rate:** ${bluffingData.player.showdown_win_percent}% (when they show their cards)  
• **Playing Style:** ${bluffingData.analysis.style}

**Strategic Assessment:**

This player's aggression level combined with their showdown performance suggests they ${bluffingData.bluffEstimate > 20 ? 'frequently use bluffs as part of their strategy. This indicates an aggressive approach that can be profitable against passive opponents.' : 'play more conservatively with fewer bluffs. This suggests a tighter, more value-oriented approach.'}`;
            
            response = {
              type: 'database',
              content,
              data: {
                type: 'bluffing_analysis',
                chartData: {
                  bluffEstimate: bluffingData.bluffEstimate,
                  aggression: bluffingData.player.postflop_aggression * 10,
                  showdown: bluffingData.player.showdown_win_percent,
                  style: bluffingData.analysis.style
                }
              }
            };
          } else {
            response = {
              type: 'database',
              content: `I couldn't find bluffing data for player **${playerName}**. Please check the spelling or try a different player name.`,
            };
          }
        } else {
          // Show top bluffers
          const bluffingData = await getBluffingAnalysis();
          if (bluffingData && bluffingData.topBluffers) {
            const topBluffers = bluffingData.topBluffers.slice(0, 5);
            const content = `**Top 5 Most Aggressive Bluffers:**

${topBluffers.map((player: any, index: number) => 
  `**${index + 1}. ${player.player_name}**

• **Estimated Bluff Rate:** ${Math.max(0, player.bluff_estimate).toFixed(1)}%
• **Aggression Level:** ${(player.postflop_aggression ?? 0).toFixed(1)}
• **Showdown Win Rate:** ${player.showdown_win_percent}%

*Click on ${player.player_name} above to view detailed analysis*`
).join('\n\n')}

**Analysis Summary:**

These players demonstrate high aggression combined with varying showdown success rates, indicating frequent bluffing strategies. Players with high aggression but lower showdown win rates are likely using bluffs more liberally, while those maintaining good showdown rates may be more selective with their bluffs.

**💡 Tip:** Click on any player name above to dive deeper into their complete playing style and performance metrics.`;

            response = {
              type: 'database',
              content,
              data: {
                type: 'top_bluffers',
                chartData: topBluffers.map(player => ({
                  name: player.player_name,
                  bluffRate: Math.max(0, player.bluff_estimate),
                  aggression: player.postflop_aggression,
                  showdown: player.showdown_win_percent
                }))
              }
            };
          } else {
            response = {
              type: 'database',
              content: "I couldn't find any bluffing data to analyze. The database might be empty or there could be a connection issue.",
            };
          }
        }
      } else if (queryTypes.topPlayers) {
        // Handle "who has won the most hands", "best player", etc.
        let category = 'winrate';
        if (queryTypes.hands) category = 'hands';
        else if (queryTypes.profit) category = 'profit';
        else if (queryTypes.winRate) category = 'winrate';
        
        const topPlayers = await getTopPlayers(category, 5);
        if (topPlayers && topPlayers.length > 0) {
          const categoryTitle = category === 'hands' ? 'Hands Played' : category === 'profit' ? 'Profit' : 'Win Rate';
          
          const content = `**Top 5 Players by ${categoryTitle}:**

${topPlayers.map((player: any, index: number) => {
  const stat = category === 'hands' ? player.hands_played.toLocaleString() + ' hands' :
               category === 'profit' ? player.net_win_bb + ' BB' :
               player.win_rate_percent + '% win rate';
  return `**${index + 1}. ${player.player_name}** - ${stat}

• **Hands Played:** ${player.hands_played.toLocaleString()}
• **Net Win:** ${player.net_win_bb} BB
• **VPIP:** ${player.preflop_vpip}%

*Click on ${player.player_name} above to view detailed analysis*`;
}).join('\n\n')}

**Analysis Summary:**

This ranking shows the ${categoryTitle.toLowerCase()} leaders in our database. ${category === 'hands' ? 'High volume players often have more reliable statistics.' : category === 'profit' ? 'These players have generated the most profit in big blinds.' : 'Win rate is a key indicator of long-term success.'} Click on any player name above to view their complete performance analysis.`;

          response = {
            type: 'database',
            content,
            data: {
              type: 'top_players',
              category,
              chartData: topPlayers.map((player: any) => ({
                name: player.player_name,
                value: category === 'hands' ? player.hands_played :
                       category === 'profit' ? player.net_win_bb :
                       player.win_rate_percent,
                winRate: player.win_rate_percent,
                netWinBB: player.net_win_bb,
                vpip: player.preflop_vpip,
                handsPlayed: player.hands_played
              }))
            }
          };
        } else {
          response = {
            type: 'database',
            content: "I couldn't find any player data to analyze. The database might be empty or there could be a connection issue.",
          };
        }
      } else {
        // Check if this is a comparison between two players
        if (queryTypes.comparison) {
          const playerNames = extractPlayerNames(message);
          
          if (playerNames.length >= 2) {
            // Compare two players
            const comparisonData = await comparePlayersStats(playerNames[0], playerNames[1]);
            
            if (comparisonData) {
              const { player1, player2, comparison } = comparisonData;
              
              const content = `**Player Comparison: ${player1.player_name} vs ${player2.player_name}**

**${player1.player_name} Statistics:**

• **Hands Played:** ${player1.hands_played.toLocaleString()}
• **Win Rate:** ${player1.win_rate_percent}%
• **Net Win:** ${player1.net_win_bb} BB
• **VPIP:** ${player1.preflop_vpip}%
• **PFR:** ${player1.preflop_pfr}%
• **Aggression:** ${(player1.postflop_aggression ?? 0).toFixed(1)}
• **Showdown Win:** ${player1.showdown_win_percent}%

**${player2.player_name} Statistics:**

• **Hands Played:** ${player2.hands_played.toLocaleString()}
• **Win Rate:** ${player2.win_rate_percent}%
• **Net Win:** ${player2.net_win_bb} BB
• **VPIP:** ${player2.preflop_vpip}%
• **PFR:** ${player2.preflop_pfr}%
• **Aggression:** ${(player2.postflop_aggression ?? 0).toFixed(1)}
• **Showdown Win:** ${player2.showdown_win_percent}%

**Comparative Analysis:**

• **Win Rate:** ${player1.player_name} ${comparison.win_rate_diff > 0 ? 'leads by' : 'trails by'} **${Math.abs(comparison.win_rate_diff).toFixed(1)}%**
• **Volume:** ${comparison.hands_played_diff > 0 ? player1.player_name : player2.player_name} has played **${Math.abs(comparison.hands_played_diff).toLocaleString()}** more hands
• **Profit:** ${comparison.net_win_diff > 0 ? player1.player_name : player2.player_name} is ahead by **${Math.abs(comparison.net_win_diff)} BB**
• **Playing Style:** ${Math.abs(comparison.vpip_diff) > 5 ? (comparison.vpip_diff > 0 ? `${player1.player_name} plays looser` : `${player2.player_name} plays looser`) : 'Similar tightness levels'}`;

              response = {
                type: 'database',
                content,
                data: {
                  type: 'player_vs_player',
                  player1: {
                    name: player1.player_name,
                    stats: {
                      hands_played: player1.hands_played,
                      win_rate: player1.win_rate_percent,
                      net_win_bb: player1.net_win_bb,
                      vpip: player1.preflop_vpip ?? 0,
                      pfr: player1.preflop_pfr ?? 0,
                      aggression: player1.postflop_aggression ?? 0,
                      showdown_win: player1.showdown_win_percent ?? 0
                    }
                  },
                  player2: {
                    name: player2.player_name,
                    stats: {
                      hands_played: player2.hands_played,
                      win_rate: player2.win_rate_percent,
                      net_win_bb: player2.net_win_bb,
                      vpip: player2.preflop_vpip ?? 0,
                      pfr: player2.preflop_pfr ?? 0,
                      aggression: player2.postflop_aggression ?? 0,
                      showdown_win: player2.showdown_win_percent ?? 0
                    }
                  },
                  comparison
                }
              };
            } else {
              response = {
                type: 'database',
                content: `I couldn't find one or both players: **${playerNames[0]}** and **${playerNames[1]}**. Please check the spelling or try different player names.`,
              };
            }
          } else if (playerNames.length === 1) {
            // Single player comparison with average
            const playerData = await getPlayerStats(playerNames[0]);
            
                      if (playerData) {
            // Check if data came from cache
            if (playerData.fromCache) {
              cachedResult = true;
            }
            
            const content = await generateDatabaseResponse(message, playerData);
            response = {
              type: 'database',
              content,
                data: {
                  type: 'player_comparison',
                  stats: {
                    player_name: playerData.player.player_name,
                    hands_played: playerData.player.hands_played.toLocaleString(),
                    win_rate: `${playerData.player.win_rate_percent}%`,
                    net_win_bb: `${playerData.player.net_win_bb} BB`,
                    vpip: `${playerData.player.preflop_vpip}%`,
                    pfr: `${playerData.player.preflop_pfr}%`,
                    aggression: playerData.player.postflop_aggression.toFixed(1),
                    showdown_win: `${playerData.player.showdown_win_percent}%`,
                    rank: playerData.rankInfo ? `${playerData.rankInfo.win_rate_rank}/${playerData.rankInfo.total_players}` : 'N/A'
                  },
                  chartData: {
                    playerStats: [
                      { name: 'VPIP', value: playerData.player.preflop_vpip, average: playerData.averages.avg_vpip },
                      { name: 'PFR', value: playerData.player.preflop_pfr, average: playerData.averages.avg_pfr },
                      { name: 'Aggression', value: playerData.player.postflop_aggression * 10, average: playerData.averages.avg_aggression * 10 },
                      { name: 'Showdown Win', value: playerData.player.showdown_win_percent, average: playerData.averages.avg_showdown },
                      { name: 'Win Rate', value: playerData.player.win_rate_percent, average: playerData.averages.avg_win_rate }
                    ]
                  }
                }
              };
            } else {
              response = {
                type: 'database',
                content: `I couldn't find a player named **${playerNames[0]}** in the database. Please check the spelling or try a different player name.`,
              };
            }
          } else {
            response = {
              type: 'database',
              content: "I understand you want to compare players, but I need specific player names. For example: 'Compare coinpoker/123 with coinpoker/456' or 'How does player-789 compare to the average?'",
            };
          }
        } else {
          // Handle specific player queries
          const playerName = extractPlayerName(message);
          
          if (playerName) {
            const playerData = await getPlayerStats(playerName);
            
            if (playerData) {
              const content = await generateDatabaseResponse(message, playerData);
              response = {
                type: 'database',
                content,
                data: {
                  type: 'player_comparison',
                  stats: {
                    player_name: playerData.player.player_name,
                    hands_played: playerData.player.hands_played.toLocaleString(),
                    win_rate: `${playerData.player.win_rate_percent}%`,
                    net_win_bb: `${playerData.player.net_win_bb} BB`,
                    vpip: `${playerData.player.preflop_vpip}%`,
                    pfr: `${playerData.player.preflop_pfr}%`,
                    aggression: playerData.player.postflop_aggression.toFixed(1),
                    showdown_win: `${playerData.player.showdown_win_percent}%`,
                    rank: playerData.rankInfo ? `${playerData.rankInfo.win_rate_rank}/${playerData.rankInfo.total_players}` : 'N/A'
                  },
                  chartData: {
                    playerStats: [
                      { name: 'VPIP', value: playerData.player.preflop_vpip, average: playerData.averages.avg_vpip },
                      { name: 'PFR', value: playerData.player.preflop_pfr, average: playerData.averages.avg_pfr },
                      { name: 'Aggression', value: playerData.player.postflop_aggression * 10, average: playerData.averages.avg_aggression * 10 },
                      { name: 'Showdown Win', value: playerData.player.showdown_win_percent, average: playerData.averages.avg_showdown },
                      { name: 'Win Rate', value: playerData.player.win_rate_percent, average: playerData.averages.avg_win_rate }
                    ]
                  }
                }
              };
            } else {
              response = {
                type: 'database',
                content: `I couldn't find a player named **${playerName}** in the database. Please check the spelling or try a different player name. You can also ask me general poker questions if you'd like!`,
              };
            }
          } else {
            response = {
              type: 'database',
              content: "I understand you're asking about player data, but I need a specific player name to analyze. Could you please specify which player you'd like me to look up? For example: 'Compare player CoinPoker-123 with the average' or 'What are the stats for player ABC123?'",
            };
          }
        }
      }
    } else {
      // General poker question - send to OpenAI
      const content = await getGeneralPokerAdvice(message);
      response = {
        type: 'general',
        content
      };
    }

    // Fallback if response is not set
    if (!response) {
      response = {
        type: 'general',
        content: "I'm having trouble processing your request. Please try rephrasing your question or ask me about specific players or general poker strategy."
      };
    }

    // Performance tracking
    const responseTime = Date.now() - startTime;
    totalResponseTime += responseTime;
    performanceMetrics.averageResponseTime = totalResponseTime / performanceMetrics.totalRequests;
    performanceMetrics.cacheHitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
    performanceMetrics.errorRate = (errorCount / performanceMetrics.totalRequests) * 100;

    // Log performance metrics every 100 requests
    if (performanceMetrics.totalRequests % 100 === 0) {
      console.log('Performance Metrics:', {
        totalRequests: performanceMetrics.totalRequests,
        averageResponseTime: `${performanceMetrics.averageResponseTime.toFixed(2)}ms`,
        cacheHitRate: `${performanceMetrics.cacheHitRate.toFixed(1)}%`,
        errorRate: `${performanceMetrics.errorRate.toFixed(1)}%`
      });
    }

    // Add performance headers
    const responseWithHeaders = NextResponse.json(response);
    responseWithHeaders.headers.set('X-Response-Time', `${responseTime}ms`);
    responseWithHeaders.headers.set('X-Cache-Status', cachedResult ? 'HIT' : 'MISS');
    
    return responseWithHeaders;

  } catch (error) {
    errorCount++;
    console.error('Chat API error:', error);
    
    const responseTime = Date.now() - startTime;
    totalResponseTime += responseTime;
    performanceMetrics.averageResponseTime = totalResponseTime / performanceMetrics.totalRequests;
    performanceMetrics.errorRate = (errorCount / performanceMetrics.totalRequests) * 100;
    
    return NextResponse.json(
      { 
        type: 'general',
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, and if the problem persists, check that all API keys are properly configured."
      },
      { status: 500 }
    );
  }
} 
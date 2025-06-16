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

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration',
    message: 'Chat API is being migrated to Turso cloud database'
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration', 
    message: 'Chat API is being migrated to Turso cloud database'
  }, { status: 503 });
} 
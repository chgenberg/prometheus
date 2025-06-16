import OpenAI from 'openai';
import { PlayerStyle } from './aiPlayer';

// Get API key from environment variables for security
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ 
  apiKey: OPENAI_API_KEY, 
  dangerouslyAllowBrowser: true 
}) : null;

interface HandHist {
  hole: string[]; // e.g. ["Ah", "Kd"]
  position: string;
  action: string;
  result: number; // chips won/lost
}

// Generate 500 synthetic hands for a TAG player (fallback)
export function generateDummyHands(count: number = 500): HandHist[] {
  const positions = ['BTN', 'CO', 'HJ', 'UTG', 'SB', 'BB'];
  const actions = ['fold', 'call', 'raise', '3bet'];
  const deckRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deckSuits = ['h', 'd', 'c', 's'];

  const randCard = () => deckRanks[Math.floor(Math.random() * 13)] + deckSuits[Math.floor(Math.random() * 4)];

  const hands: HandHist[] = [];
  for (let i = 0; i < count; i++) {
    const hole1 = randCard();
    let hole2 = randCard();
    while (hole2 === hole1) hole2 = randCard();

    hands.push({
      hole: [hole1, hole2],
      position: positions[Math.floor(Math.random() * positions.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      result: Math.floor(Math.random() * 20) - 10 // win/loss between -10 and +9 chips
    });
  }
  return hands;
}

// Fetch real player hand history from API
export async function fetchPlayerHands(playerName: string): Promise<HandHist[]> {
  try {
    const response = await fetch(`/api/player-hands/${encodeURIComponent(playerName)}?limit=500`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch player hands';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (jsonError) {
        console.error('Failed to parse error response as JSON:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.hand_history || !Array.isArray(data.hand_history)) {
      throw new Error('Invalid response format: missing hand_history array');
    }
    
    return data.hand_history;
  } catch (error) {
    console.error('Error fetching player hands:', error);
    throw error;
  }
}

// Enhanced OpenAI analysis with more detailed prompt
export async function fetchStyleFromOpenAI(hands: HandHist[], playerName?: string): Promise<PlayerStyle> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY environment variable.');
  }

  const handSample = hands.slice(0, 300); // Use first 300 hands for analysis
  
  const prompt = `You are an expert poker analyst. Analyze this CoinPoker player's hand history and create a detailed playing style profile.

Player: ${playerName || 'Unknown Player'}
Hands analyzed: ${handSample.length}

Hand History Sample:
${JSON.stringify(handSample, null, 2).slice(0, 8000)}

Based on this data, return ONLY a JSON object with these exact keys:
{
  "name": "Player's style name (e.g., 'Tight Aggressive', 'Loose Passive', 'Maniac')",
  "vpip": number (0-100, percentage of hands played voluntarily),
  "pfr": number (0-100, preflop raise percentage),
  "aggression": number (0-100, postflop aggression factor),
  "threeBet": number (0-100, 3-bet frequency),
  "foldToCBet": number (0-100, fold to continuation bet percentage),
  "bluffFreq": number (0-100, bluffing frequency),
  "tightness": number (0-100, overall tightness, higher = more selective)
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no backticks, no explanations.`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  });

  let jsonText = resp.choices[0].message.content?.trim() ?? '{}';
  
  // Clean up the response - remove markdown formatting if present
  jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/`/g, '');
  
  // Remove any leading/trailing whitespace and newlines
  jsonText = jsonText.trim();
  
  // If the response starts with something other than {, try to find the JSON
  if (!jsonText.startsWith('{')) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      console.error('No valid JSON found in OpenAI response:', jsonText);
      throw new Error('Invalid response format from AI analysis');
    }
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    console.log('Successfully parsed OpenAI response:', parsed);
    
    // Ensure we have a valid PlayerStyle object
    return {
      name: parsed.name || `${playerName || 'AI'} Style`,
      vpip: Math.max(0, Math.min(100, parsed.vpip || 25)),
      pfr: Math.max(0, Math.min(100, parsed.pfr || 18)),
      aggression: Math.max(0, Math.min(100, parsed.aggression || 50)),
      threeBet: Math.max(0, Math.min(100, parsed.threeBet || 8)),
      foldToCBet: Math.max(0, Math.min(100, parsed.foldToCBet || 45)),
      bluffFreq: Math.max(0, Math.min(100, parsed.bluffFreq || 25)),
      tightness: Math.max(0, Math.min(100, parsed.tightness || 70))
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', parseError);
    console.error('Raw response:', jsonText);
    throw new Error('Invalid response from AI analysis');
  }
}

// Main function to analyze a player and return their style
export async function analyzePlayerStyle(playerName: string): Promise<PlayerStyle> {
  try {
    // First try to get real hand history
    const hands = await fetchPlayerHands(playerName);
    console.log(`Analyzing ${hands.length} hands for ${playerName}`);
    
    // Send to OpenAI for analysis
    const style = await fetchStyleFromOpenAI(hands, playerName);
    
    // Cache the result in localStorage for future use
    const cacheKey = `player_style_${playerName}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      style,
      timestamp: Date.now(),
      handsAnalyzed: hands.length
    }));
    
    return style;
  } catch (error) {
    console.error('Player analysis failed:', error);
    throw error;
  }
}

// Check if we have a cached style for this player (valid for 24 hours)
export function getCachedPlayerStyle(playerName: string): PlayerStyle | null {
  try {
    const cacheKey = `player_style_${playerName}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      const hoursSinceCache = (Date.now() - data.timestamp) / (1000 * 60 * 60);
      
      if (hoursSinceCache < 24) {
        console.log(`Using cached style for ${playerName} (${Math.round(hoursSinceCache)}h old)`);
        return data.style;
      }
    }
  } catch (error) {
    console.error('Error reading cached style:', error);
  }
  
  return null;
} 
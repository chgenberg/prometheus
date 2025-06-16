// AI Player Logic
import { Card, Hand, evaluateHand } from './pokerLogic';

export interface PlayerStyle {
  name: string;
  vpip: number; // Voluntarily Put In Pot percentage (0-100)
  pfr: number;  // Preflop Raise percentage (0-100)
  aggression: number; // Postflop aggression (0-100)
  threeBet: number; // 3-bet frequency (0-100)
  foldToCBet: number; // Fold to continuation bet (0-100)
  bluffFreq: number; // Bluff frequency (0-100)
  tightness: number; // How tight the player is (0-100)
}

export type GameStage = 'preflop' | 'flop' | 'turn' | 'river';
export type Action = 'fold' | 'call' | 'raise' | 'check' | 'bet';

export interface GameState {
  stage: GameStage;
  pot: number;
  playerChips: number;
  opponentChips: number;
  currentBet: number;
  playerBet: number;
  opponentBet: number;
  holeCards: Card[];
  communityCards: Card[];
  isPlayerAction: boolean;
}

export interface AIDecision {
  action: Action;
  amount?: number;
  confidence: number; // 0-100
  reasoning: string;
}

// Generate dummy player with realistic poker stats
export function generateDummyPlayer(): PlayerStyle {
  // Create a tight-aggressive player (common winning style)
  return {
    name: "CoinPoker AI",
    vpip: 22.5, // Plays about 22% of hands
    pfr: 18.2,  // Raises 18% of hands
    aggression: 65, // Fairly aggressive postflop
    threeBet: 8.5, // 3-bets 8.5% when facing a raise
    foldToCBet: 45, // Folds to continuation bets 45% of time
    bluffFreq: 25, // Bluffs 25% of time in spots
    tightness: 75 // Quite tight player
  };
}

// Create different player styles for variety
export function generatePlayerStyles(): PlayerStyle[] {
  return [
    {
      name: "The Rock",
      vpip: 15, pfr: 12, aggression: 40, threeBet: 5, foldToCBet: 65, bluffFreq: 10, tightness: 90
    },
    {
      name: "The Shark", 
      vpip: 24, pfr: 20, aggression: 75, threeBet: 12, foldToCBet: 35, bluffFreq: 35, tightness: 70
    },
    {
      name: "The Maniac",
      vpip: 45, pfr: 35, aggression: 85, threeBet: 25, foldToCBet: 25, bluffFreq: 60, tightness: 20
    },
    {
      name: "The Calling Station",
      vpip: 55, pfr: 15, aggression: 30, threeBet: 4, foldToCBet: 15, bluffFreq: 10, tightness: 25
    },
    {
      name: "The TAG",
      vpip: 22, pfr: 18, aggression: 65, threeBet: 9, foldToCBet: 45, bluffFreq: 25, tightness: 75
    }
  ];
}

// Calculate hand strength (0-1)
export function calculateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (communityCards.length === 0) {
    // Preflop hand strength based on hole cards
    return calculatePreflopStrength(holeCards);
  }
  
  // Postflop - evaluate actual hand
  const hand = evaluateHand(holeCards, communityCards);
  
  // Convert hand rank to strength (rough approximation)
  const maxPossibleRank = 10000000; // Approximate max hand rank
  return Math.min(hand.handRank / maxPossibleRank, 1);
}

// Simple preflop hand strength
function calculatePreflopStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;
  
  const [card1, card2] = holeCards;
  const isPair = card1.value === card2.value;
  const isSuited = card1.suit === card2.suit;
  const highCard = Math.max(card1.value, card2.value);
  const lowCard = Math.min(card1.value, card2.value);
  const gap = highCard - lowCard;
  
  let strength = 0;
  
  // Pocket pairs
  if (isPair) {
    strength = 0.5 + (highCard / 14) * 0.4; // AA = 0.9, 22 = 0.56
  } else {
    // High cards
    strength = (highCard + lowCard) / 28 * 0.8; // AK = 0.77
    
    // Suited bonus
    if (isSuited) {
      strength += 0.05;
    }
    
    // Gap penalty
    if (gap > 4) {
      strength -= 0.1;
    }
  }
  
  return Math.min(Math.max(strength, 0), 1);
}

// AI makes decision based on game state and player style
export function makeAIDecision(gameState: GameState, playerStyle: PlayerStyle): AIDecision {
  const handStrength = calculateHandStrength(gameState.holeCards, gameState.communityCards);
  const potOdds = gameState.currentBet / (gameState.pot + gameState.currentBet);
  
  // Adjust decision based on game stage
  switch (gameState.stage) {
    case 'preflop':
      return makePreflopDecision(gameState, playerStyle, handStrength);
    case 'flop':
    case 'turn':
    case 'river':
      return makePostflopDecision(gameState, playerStyle, handStrength, potOdds);
    default:
      return { action: 'fold', confidence: 100, reasoning: 'Unknown game stage' };
  }
}

function makePreflopDecision(gameState: GameState, style: PlayerStyle, handStrength: number): AIDecision {
  const { currentBet, playerBet, opponentBet } = gameState;
  const facingBet = currentBet > playerBet;
  const facingRaise = opponentBet > 0 && currentBet > opponentBet;
  
  // Very strong hands - always play aggressively
  if (handStrength >= 0.85) {
    if (facingBet) {
      const shouldThreeBet = Math.random() * 100 < style.threeBet * 1.5;
      if (shouldThreeBet) {
        return {
          action: 'raise',
          amount: currentBet * 3,
          confidence: 90,
          reasoning: 'Strong hand - 3-betting for value'
        };
      }
      return {
        action: 'call',
        confidence: 85,
        reasoning: 'Strong hand - calling to see flop'
      };
    } else {
      const shouldRaise = Math.random() * 100 < style.pfr;
      return {
        action: shouldRaise ? 'raise' : 'call',
        amount: shouldRaise ? Math.max(currentBet * 2.5, 20) : undefined,
        confidence: 80,
        reasoning: shouldRaise ? 'Strong hand - raising for value' : 'Strong hand - calling'
      };
    }
  }
  
  // Medium hands - play based on style
  if (handStrength >= 0.5) {
    if (facingBet) {
      const shouldCall = Math.random() * 100 < (style.vpip - style.tightness * 0.2);
      if (shouldCall) {
        return {
          action: 'call',
          confidence: 60,
          reasoning: 'Decent hand - calling to see flop'
        };
      }
    } else {
      const shouldPlay = Math.random() * 100 < style.vpip;
      if (shouldPlay) {
        const shouldRaise = Math.random() * 100 < style.pfr;
        return {
          action: shouldRaise ? 'raise' : 'call',
          amount: shouldRaise ? Math.max(currentBet * 2, 10) : undefined,
          confidence: 50,
          reasoning: 'Playable hand'
        };
      }
    }
  }
  
  // Weak hands - mostly fold unless very loose
  const shouldBluff = Math.random() * 100 < style.bluffFreq * 0.3; // Reduced bluff frequency preflop
  if (shouldBluff && !facingBet) {
    return {
      action: 'raise',
      amount: Math.max(currentBet * 2, 10),
      confidence: 30,
      reasoning: 'Bluffing with weak hand'
    };
  }
  
  return {
    action: 'fold',
    confidence: 70,
    reasoning: 'Weak hand - folding'
  };
}

function makePostflopDecision(gameState: GameState, style: PlayerStyle, handStrength: number, potOdds: number): AIDecision {
  const { currentBet, playerBet, pot } = gameState;
  const facingBet = currentBet > playerBet;
  
  // Very strong hands (top pair or better)
  if (handStrength >= 0.7) {
    if (facingBet) {
      const shouldRaise = Math.random() * 100 < style.aggression;
      if (shouldRaise) {
        return {
          action: 'raise',
          amount: currentBet + pot * 0.7,
          confidence: 85,
          reasoning: 'Strong hand - raising for value'
        };
      }
      return {
        action: 'call',
        confidence: 80,
        reasoning: 'Strong hand - calling'
      };
    } else {
      const shouldBet = Math.random() * 100 < style.aggression;
      return {
        action: shouldBet ? 'bet' : 'check',
        amount: shouldBet ? pot * 0.6 : undefined,
        confidence: 75,
        reasoning: shouldBet ? 'Strong hand - betting for value' : 'Strong hand - checking'
      };
    }
  }
  
  // Medium hands (pair, draw)
  if (handStrength >= 0.4) {
    if (facingBet) {
      const shouldCall = handStrength > potOdds * 2; // Rough pot odds calculation
      if (shouldCall) {
        return {
          action: 'call',
          confidence: 60,
          reasoning: 'Medium hand - getting good odds'
        };
      }
    } else {
      const shouldBet = Math.random() * 100 < style.aggression * 0.6;
      return {
        action: shouldBet ? 'bet' : 'check',
        amount: shouldBet ? pot * 0.4 : undefined,
        confidence: 50,
        reasoning: shouldBet ? 'Medium hand - betting' : 'Medium hand - checking'
      };
    }
  }
  
  // Weak hands - mostly check/fold, occasional bluff
  if (facingBet) {
    const shouldBluffRaise = Math.random() * 100 < style.bluffFreq * 0.2;
    if (shouldBluffRaise) {
      return {
        action: 'raise',
        amount: currentBet + pot,
        confidence: 25,
        reasoning: 'Bluffing with weak hand'
      };
    }
    
    const shouldCall = Math.random() * 100 < (100 - style.foldToCBet);
    if (shouldCall && potOdds < 0.3) {
      return {
        action: 'call',
        confidence: 30,
        reasoning: 'Weak hand - calling with good odds'
      };
    }
    
    return {
      action: 'fold',
      confidence: 70,
      reasoning: 'Weak hand - folding to bet'
    };
  } else {
    const shouldBluff = Math.random() * 100 < style.bluffFreq;
    if (shouldBluff) {
      return {
        action: 'bet',
        amount: pot * 0.7,
        confidence: 30,
        reasoning: 'Bluffing'
      };
    }
    
    return {
      action: 'check',
      confidence: 60,
      reasoning: 'Weak hand - checking'
    };
  }
} 
// Poker Logic Library
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-14 (ace high)
}

export interface Hand {
  cards: Card[];
  handType: HandType;
  handRank: number;
  description: string;
}

export enum HandType {
  HighCard = 1,
  Pair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Create a standard 52-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: index + 2 // 2-14
      });
    });
  });
  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards from deck
export function dealCards(deck: Card[], count: number): { cards: Card[], remainingDeck: Card[] } {
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  return { cards, remainingDeck };
}

// Evaluate poker hand (Texas Hold'em - 2 hole cards + 5 community cards)
export function evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
  const allCards = [...holeCards, ...communityCards];
  const bestHand = findBestHand(allCards);
  return bestHand;
}

// Find best 5-card hand from 7 cards
function findBestHand(cards: Card[]): Hand {
  if (cards.length < 5) {
    return {
      cards: cards.slice(0, 5),
      handType: HandType.HighCard,
      handRank: 0,
      description: 'Invalid hand'
    };
  }

  const combinations = getCombinations(cards, 5);
  let bestHand: Hand | null = null;

  combinations.forEach(combo => {
    const hand = evaluateFiveCardHand(combo);
    if (!bestHand || hand.handRank > bestHand.handRank) {
      bestHand = hand;
    }
  });

  return bestHand!;
}

// Get all 5-card combinations from array of cards
function getCombinations(cards: Card[], size: number): Card[][] {
  if (size > cards.length) return [];
  if (size === 1) return cards.map(card => [card]);
  if (size === cards.length) return [cards];

  const combinations: Card[][] = [];
  const firstCard = cards[0];
  const restCards = cards.slice(1);

  // Include first card
  const withFirst = getCombinations(restCards, size - 1);
  withFirst.forEach(combo => combinations.push([firstCard, ...combo]));

  // Exclude first card
  const withoutFirst = getCombinations(restCards, size);
  combinations.push(...withoutFirst);

  return combinations;
}

// Evaluate exactly 5 cards
function evaluateFiveCardHand(cards: Card[]): Hand {
  const sortedCards = [...cards].sort((a, b) => b.value - a.value);
  
  // Check for flush
  const isFlush = cards.every(card => card.suit === cards[0].suit);
  
  // Check for straight
  const values = sortedCards.map(card => card.value);
  const isStraight = checkStraight(values);
  
  // Special case: A-2-3-4-5 straight (wheel)
  const isWheel = values.join(',') === '14,5,4,3,2';
  
  if (isFlush && (isStraight || isWheel)) {
    if (values.join(',') === '14,13,12,11,10') {
      return {
        cards: sortedCards,
        handType: HandType.RoyalFlush,
        handRank: HandType.RoyalFlush * 1000000,
        description: 'Royal Flush'
      };
    }
    return {
      cards: sortedCards,
      handType: HandType.StraightFlush,
      handRank: HandType.StraightFlush * 1000000 + (isWheel ? 5 : values[0]),
      description: 'Straight Flush'
    };
  }

  // Count values
  const valueCounts = new Map<number, number>();
  values.forEach(value => {
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });

  const counts = Array.from(valueCounts.values()).sort((a, b) => b - a);
  const uniqueValues = Array.from(valueCounts.keys()).sort((a, b) => b - a);

  // Four of a kind
  if (counts[0] === 4) {
    const quadValue = uniqueValues.find(val => valueCounts.get(val) === 4)!;
    const kicker = uniqueValues.find(val => valueCounts.get(val) === 1)!;
    return {
      cards: sortedCards,
      handType: HandType.FourOfAKind,
      handRank: HandType.FourOfAKind * 1000000 + quadValue * 1000 + kicker,
      description: 'Four of a Kind'
    };
  }

  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    const tripValue = uniqueValues.find(val => valueCounts.get(val) === 3)!;
    const pairValue = uniqueValues.find(val => valueCounts.get(val) === 2)!;
    return {
      cards: sortedCards,
      handType: HandType.FullHouse,
      handRank: HandType.FullHouse * 1000000 + tripValue * 1000 + pairValue,
      description: 'Full House'
    };
  }

  // Flush
  if (isFlush) {
    return {
      cards: sortedCards,
      handType: HandType.Flush,
      handRank: HandType.Flush * 1000000 + values.reduce((sum, val, idx) => sum + val * Math.pow(100, 4 - idx), 0),
      description: 'Flush'
    };
  }

  // Straight
  if (isStraight || isWheel) {
    return {
      cards: sortedCards,
      handType: HandType.Straight,
      handRank: HandType.Straight * 1000000 + (isWheel ? 5 : values[0]),
      description: 'Straight'
    };
  }

  // Three of a kind
  if (counts[0] === 3) {
    const tripValue = uniqueValues.find(val => valueCounts.get(val) === 3)!;
    const kickers = uniqueValues.filter(val => valueCounts.get(val) === 1).sort((a, b) => b - a);
    return {
      cards: sortedCards,
      handType: HandType.ThreeOfAKind,
      handRank: HandType.ThreeOfAKind * 1000000 + tripValue * 10000 + kickers[0] * 100 + kickers[1],
      description: 'Three of a Kind'
    };
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = uniqueValues.filter(val => valueCounts.get(val) === 2).sort((a, b) => b - a);
    const kicker = uniqueValues.find(val => valueCounts.get(val) === 1)!;
    return {
      cards: sortedCards,
      handType: HandType.TwoPair,
      handRank: HandType.TwoPair * 1000000 + pairs[0] * 10000 + pairs[1] * 100 + kicker,
      description: 'Two Pair'
    };
  }

  // One pair
  if (counts[0] === 2) {
    const pairValue = uniqueValues.find(val => valueCounts.get(val) === 2)!;
    const kickers = uniqueValues.filter(val => valueCounts.get(val) === 1).sort((a, b) => b - a);
    return {
      cards: sortedCards,
      handType: HandType.Pair,
      handRank: HandType.Pair * 1000000 + pairValue * 1000000 + kickers.reduce((sum, val, idx) => sum + val * Math.pow(100, 2 - idx), 0),
      description: 'One Pair'
    };
  }

  // High card
  return {
    cards: sortedCards,
    handType: HandType.HighCard,
    handRank: HandType.HighCard * 1000000 + values.reduce((sum, val, idx) => sum + val * Math.pow(100, 4 - idx), 0),
    description: 'High Card'
  };
}

function checkStraight(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

// Compare hands (returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie)
export function compareHands(hand1: Hand, hand2: Hand): number {
  if (hand1.handRank > hand2.handRank) return 1;
  if (hand1.handRank < hand2.handRank) return -1;
  return 0;
}

// Get card display name
export function getCardDisplay(card: Card): string {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

// Get card color for styling
export function getCardColor(card: Card): 'red' | 'black' {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
} 
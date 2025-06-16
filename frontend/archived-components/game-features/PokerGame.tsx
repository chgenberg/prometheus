'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createDeck, shuffleDeck, dealCards, Card, evaluateHand, getCardDisplay, getCardColor, compareHands } from '@/lib/pokerLogic';
import { generateDummyPlayer, makeAIDecision, GameState, PlayerStyle } from '@/lib/aiPlayer';
import { generateDummyHands, fetchStyleFromOpenAI } from '@/lib/openaiStyle';
import { X } from 'lucide-react';

interface PokerGameProps {
  onClose: () => void;
  aiStyle?: PlayerStyle;
  playerName?: string;
}

// Simple chip setup
const STARTING_STACK = 1000;

export default function PokerGame({ onClose, aiStyle: externalStyle, playerName = "AI Opponent" }: PokerGameProps) {
  // Game state
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [aiCards, setAiCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [stage, setStage] = useState<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('preflop');
  const [playerStack, setPlayerStack] = useState(STARTING_STACK);
  const [aiStack, setAIStack] = useState(STARTING_STACK);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [style, setStyle] = useState<PlayerStyle | null>(externalStyle ?? null);

  // fetch style if none
  useEffect(() => {
    if (!style) {
      (async () => {
        const hands = generateDummyHands(500);
        try {
          const s = await fetchStyleFromOpenAI(hands);
          setStyle(s);
        } catch (e) {
          console.error('OpenAI style fetch failed, falling back', e);
          setStyle(generateDummyPlayer());
        }
      })();
    }
  }, [style]);

  // Initialise game when style ready
  useEffect(() => {
    if (style) startNewHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  if (!style) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">♠</span>
              </div>
            </div>
            <p className="text-white text-lg font-semibold">Genererar AI-spelstil...</p>
            <p className="text-purple-300 text-sm">Analyserar pokerstrategi</p>
          </div>
        </div>
      </div>
    );
  }

  const startNewHand = () => {
    const newDeck = shuffleDeck(createDeck());
    // Deal hole cards
    let { cards: pCards, remainingDeck } = dealCards(newDeck, 2);
    const { cards: aiHole, remainingDeck: rem2 } = dealCards(remainingDeck, 2);
    setPlayerCards(pCards);
    setAiCards(aiHole);
    setDeck(rem2);
    setCommunityCards([]);
    setStage('preflop');
    setPot(0);
    setCurrentBet(0);
    setMessage('');
  };

  // --- Player actions --- //
  const handleFold = () => {
    setMessage('Du foldade, AI vinner potten.');
    setAIStack(aiStack + pot);
    setPot(0);
    setStage('showdown');
  };

  const handleCallCheck = () => {
    const callAmount = currentBet;
    setPlayerStack(playerStack - callAmount);
    setPot(pot + callAmount);
    setCurrentBet(0);
    // Proceed to next stage
    goToNextStage();
  };

  const handleBet = (amount: number) => {
    amount = Math.min(amount, playerStack);
    setPlayerStack(playerStack - amount);
    setPot(pot + amount);
    setCurrentBet(amount);
    // AI decision immediately after player bet
    processAIDecision(amount);
  };

  const goToNextStage = () => {
    if (stage === 'preflop') {
      dealCommunity(3);
      setStage('flop');
    } else if (stage === 'flop') {
      dealCommunity(1);
      setStage('turn');
    } else if (stage === 'turn') {
      dealCommunity(1);
      setStage('river');
    } else if (stage === 'river') {
      setStage('showdown');
      determineWinner();
    }
  };

  const dealCommunity = (count: number) => {
    const { cards: newCards, remainingDeck } = dealCards(deck, count);
    setDeck(remainingDeck);
    setCommunityCards(prev => [...prev, ...newCards]);
  };

  // --- AI action processing --- //
  const processAIDecision = (playerBet: number) => {
    const gs: GameState = {
      stage: stage as any,
      pot,
      playerChips: aiStack,
      opponentChips: playerStack,
      currentBet: playerBet,
      playerBet: 0,
      opponentBet: playerBet,
      holeCards: aiCards,
      communityCards,
      isPlayerAction: true,
    };
    const decision = makeAIDecision(gs, style);

    if (decision.action === 'fold') {
      setMessage('AI foldade! Du vinner potten.');
      setPlayerStack(playerStack + pot + playerBet);
      setPot(0);
      setStage('showdown');
      return;
    }

    let aiBet = 0;
    if (decision.action === 'call') {
      aiBet = playerBet;
    } else if (decision.action === 'raise' || decision.action === 'bet') {
      aiBet = decision.amount ? Math.min(decision.amount, aiStack) : playerBet * 2;
    }
    // Update stacks and pot
    setAIStack(prev => prev - aiBet);
    setPot(prev => prev + aiBet);
    setCurrentBet(aiBet);

    // If AI just called we move to next stage automatically
    if (decision.action === 'call' || decision.action === 'check') {
      goToNextStage();
    }
  };

  const determineWinner = () => {
    const playerHand = evaluateHand(playerCards, communityCards);
    const aiHand = evaluateHand(aiCards, communityCards);
    const result = compareHands(playerHand, aiHand);

    if (result === 1) {
      setMessage(`Du vinner med ${playerHand.description}!`);
      setPlayerStack(playerStack + pot);
    } else if (result === -1) {
      setMessage(`AI vinner med ${aiHand.description}.`);
      setAIStack(aiStack + pot);
    } else {
      setMessage('Potten delas.');
      setPlayerStack(playerStack + pot / 2);
      setAIStack(aiStack + pot / 2);
    }
    setPot(0);
  };

  // --- Render helpers --- //
  const renderChips = (amount: number) => {
    const chips: React.ReactNode[] = [];
    const chipValues = [
      { value: 1000, color: 'from-yellow-400 to-yellow-600', label: '1K' },
      { value: 500, color: 'from-purple-400 to-purple-600', label: '500' },
      { value: 100, color: 'from-black to-gray-800', label: '100' },
      { value: 25, color: 'from-green-400 to-green-600', label: '25' },
      { value: 5, color: 'from-red-400 to-red-600', label: '5' },
      { value: 1, color: 'from-blue-400 to-blue-600', label: '1' }
    ];

    let remaining = amount;
    chipValues.forEach(({ value, color, label }) => {
      const count = Math.floor(remaining / value);
      remaining = remaining % value;
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        chips.push(
          <div
            key={`${value}-${i}`}
            className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${color} shadow-lg border-2 border-white/20 flex items-center justify-center transform hover:scale-110 transition-transform`}
            style={{ marginLeft: i > 0 ? '-8px' : '0' }}
          >
            <span className="text-white text-xs font-bold">{label}</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
          </div>
        );
      }
      
      if (count > 3) {
        chips.push(
          <div key={`${value}-more`} className="text-white/60 text-sm ml-1">
            +{count - 3}
          </div>
        );
      }
    });

    return chips;
  };

  const renderCard = (card: Card, hidden = false) => {
    if (hidden) {
      return (
        <div
          key={Math.random()}
          className="relative w-[70px] h-[100px] transform transition-all duration-300 hover:scale-110 hover:-translate-y-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl">
            <div className="absolute inset-[2px] bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-600 text-5xl opacity-30">♠</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-xl" />
            </div>
          </div>
        </div>
      );
    }

    const display = getCardDisplay(card);
    const color = getCardColor(card);
    const suit = card.suit;
    const suitSymbol = suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠';
    const isRed = suit === 'hearts' || suit === 'diamonds';

    return (
      <div
        key={display + Math.random()}
        className="relative w-[70px] h-[100px] transform transition-all duration-300 hover:scale-110 hover:-translate-y-2 cursor-pointer"
      >
        <div className="absolute inset-0 bg-white rounded-xl shadow-2xl">
          {/* Card content */}
          <div className="absolute inset-0 p-2">
            {/* Top left */}
            <div className="absolute top-2 left-2 flex flex-col items-center leading-none">
              <div className={`text-xl font-bold ${isRed ? 'text-red-500' : 'text-gray-900'}`}>{card.rank}</div>
              <div className={`text-xl ${isRed ? 'text-red-500' : 'text-gray-900'} -mt-1`}>{suitSymbol}</div>
            </div>
            {/* Bottom right */}
            <div className="absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180">
              <div className={`text-xl font-bold ${isRed ? 'text-red-500' : 'text-gray-900'}`}>{card.rank}</div>
              <div className={`text-xl ${isRed ? 'text-red-500' : 'text-gray-900'} -mt-1`}>{suitSymbol}</div>
            </div>
            {/* Center symbol */}
            <div className={`absolute inset-0 flex items-center justify-center text-5xl ${isRed ? 'text-red-500' : 'text-gray-900'} opacity-20`}>
              {suitSymbol}
            </div>
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-xl" />
        </div>
      </div>
    );
  };

  const actionButtons = (
    <div className="flex gap-4">
      <button
        onClick={handleFold}
        className="group relative w-32 py-3 bg-gray-900 text-gray-300 rounded-2xl font-medium tracking-wide overflow-hidden transition-all duration-300 hover:bg-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-red-600/0 group-hover:from-red-600/20 group-hover:to-red-500/20 transition-all duration-300" />
        <span className="relative">Fold</span>
      </button>
      <button
        onClick={handleCallCheck}
        className="group relative w-32 py-3 bg-indigo-600 text-white rounded-2xl font-medium tracking-wide overflow-hidden transition-all duration-300 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/0 group-hover:from-white/10 group-hover:to-white/5 transition-all duration-300" />
        <span className="relative">{currentBet === 0 ? 'Check' : `Call ${currentBet}`}</span>
      </button>
      <button
        onClick={() => handleBet(Math.max(20, pot))}
        className="group relative w-32 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-medium tracking-wide overflow-hidden transition-all duration-300 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-600/30"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/0 group-hover:from-white/20 group-hover:to-white/10 transition-all duration-300" />
        <span className="relative flex items-center justify-center gap-1">
          <span>{currentBet === 0 ? 'Bet' : 'Raise'}</span>
          <span className="text-xs opacity-75">{Math.max(20, pot)}</span>
        </span>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-[900px]">
        {/* Poker table background */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/POKER_GAME/table.png)' }}
        />

        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl flex items-center justify-center text-white/80 hover:text-white transition-all duration-300"
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        {/* Game content - centered on table */}
        <div className="relative h-full flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {/* Table content wrapper */}
            <div className="relative">
              {/* AI Player (top) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    {aiCards.map(card => renderCard(card, stage !== 'showdown'))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-2 min-w-[160px]">
                      <p className="text-white/60 text-xs font-light tracking-wider uppercase">{playerName}</p>
                      <p className="text-white text-lg font-light">${aiStack}</p>
                    </div>
                    {currentBet > 0 && stage !== 'showdown' && (
                      <div className="flex gap-1 animate-slideDown">
                        {renderChips(currentBet)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Center area - Community cards and pot */}
              <div className="flex flex-col items-center gap-6 py-20">
                {/* Community cards */}
                <div className="flex gap-3">
                  {communityCards.length === 0 ? (
                    <>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-[70px] h-[100px] bg-white/5 backdrop-blur-sm rounded-xl border border-white/10" />
                      ))}
                    </>
                  ) : (
                    <>
                      {communityCards.map(card => renderCard(card))}
                      {/* Fill empty slots */}
                      {Array(5 - communityCards.length).fill(0).map((_, i) => (
                        <div key={`empty-${i}`} className="w-[70px] h-[100px] bg-white/5 backdrop-blur-sm rounded-xl border border-white/10" />
                      ))}
                    </>
                  )}
                </div>

                {/* Pot display with chips */}
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-2xl px-8 py-3 border border-white/10">
                    <p className="text-white/60 text-xs font-light tracking-wider uppercase mb-1">Pot</p>
                    <p className="text-white text-2xl font-light">${pot}</p>
                  </div>
                  {pot > 0 && (
                    <div className="flex gap-1">
                      {renderChips(pot)}
                    </div>
                  )}
                </div>

                {/* Game message */}
                {message && (
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-full px-6 py-2">
                    <p className="text-white/90 text-sm font-light">{message}</p>
                  </div>
                )}
              </div>

              {/* Player (bottom) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    {currentBet > 0 && stage !== 'showdown' && (
                      <div className="flex gap-1 animate-slideUp">
                        {renderChips(currentBet)}
                      </div>
                    )}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-2 min-w-[160px]">
                      <p className="text-white/60 text-xs font-light tracking-wider uppercase">You</p>
                      <p className="text-white text-lg font-light">${playerStack}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {playerCards.map(card => renderCard(card))}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-4">
                    {stage !== 'showdown' ? actionButtons : (
                      <button 
                        onClick={startNewHand} 
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-medium tracking-wide shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        New Hand
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, getCoinpokerPlayers, closeDb } from '../../../../lib/database-api-helper';

// This interface should be shared, but for now, we define it here to fix the build.
interface RealHandAction {
  hand_id: string;
  player_id: string;
  position: string;
  street: string;
  action_type: string;
  amount: number;
  hole_cards: string;
  community_cards: string;
  pot_before: number;
  money_won: number;
  stakes: string;
  player_intention: string;
  timestamp: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerName: string }> }
) {
  try {
    const { playerName: encodedPlayerName } = await params;
    let playerName: string;
    
    try {
      playerName = decodeURIComponent(encodedPlayerName);
    } catch (decodeError) {
      console.error('Failed to decode player name:', encodedPlayerName, decodeError);
      return NextResponse.json({ error: 'Invalid player name format' }, { status: 400 });
    }
    
    const db = await getApiDb();

    console.log('Fetching player data for:', playerName);
    
    // Get all coinpoker players and find the specific one
    const allPlayers = await getCoinpokerPlayers(db);
    const targetPlayer = allPlayers.find(p => p.player_id === playerName);

    console.log('Player stats result:', targetPlayer);

    if (!targetPlayer) {
      console.log('No player found with name:', playerName);
      await closeDb(db);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Transform player data to match expected format
    const playerStats = {
      player_name: targetPlayer.player_id,
      total_hands: targetPlayer.total_hands || 0,
      net_win_bb: targetPlayer.net_win_bb || 0,
      win_rate_percent: targetPlayer.total_hands > 0 ? parseFloat(((targetPlayer.net_win_bb || 0) / targetPlayer.total_hands * 100).toFixed(2)) : 0,
      preflop_vpip: targetPlayer.vpip || 0,
      preflop_pfr: targetPlayer.pfr || 0,
      postflop_aggression: targetPlayer.avg_postflop_score || 0,
      showdown_win_percent: 50 + Math.random() * 20 - 10, // Simulated
      last_updated: targetPlayer.updated_at || new Date().toISOString(),
      avg_preflop_score: targetPlayer.avg_preflop_score || 0,
      avg_postflop_score: targetPlayer.avg_postflop_score || 0,
      intention_score: targetPlayer.intention_score || 0,
      collusion_score: targetPlayer.collution_score || 0, // Note: database uses "collution"
      bad_actor_score: targetPlayer.bad_actor_score || 0
    };

    // Since we don't have detailed hand data in the new structure,
    // we'll create simulated hand history based on the player's stats
    const generateMockHandData = (stats: any): RealHandAction[] => {
      const hands: RealHandAction[] = [];
      const handsToShow = Math.min(50, stats.total_hands);
      
      for (let i = 0; i < handsToShow; i++) {
        const randomDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const street = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'][Math.floor(Math.random() * 4)];
        const action = ['bet', 'raise', 'call', 'check', 'fold'][Math.floor(Math.random() * 5)];
        
        hands.push({
          hand_id: `sim_${i + 1}`,
          player_id: stats.player_name,
          position: ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'][Math.floor(Math.random() * 6)],
          street: street,
          action_type: action,
          amount: action === 'bet' || action === 'raise' ? Math.random() * 100 : 0,
          hole_cards: 'As Kh', // Mock cards
          community_cards: generateRandomBoard(),
          pot_before: Math.random() * 200,
          money_won: Math.random() > 0.5 ? Math.random() * 1000 - 500 : 0,
          stakes: '1/2',
          player_intention: 'value',
          timestamp: randomDate.toISOString(),
        });
      }
      
      return hands.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const handData = generateMockHandData(playerStats);

    // Calculate additional statistics
    const totalHands = handData.length;

    const winningHands = handData.filter(hand => hand.money_won > 0).length;
    const losingHands = handData.filter(hand => hand.money_won < 0).length;
    const breakEvenHands = totalHands - winningHands - losingHands;

    // Calculate performance over time for chart
    let cumulativeBB = 0;
    const performanceData = handData.slice().reverse().map((hand) => {
      const sessionBB = (hand.money_won || 0) / 100; // Assuming bb = 100 chips
      cumulativeBB += sessionBB;
      return {
        date: hand.timestamp.split('T')[0],
        cumulative_bb: Math.round(cumulativeBB * 100) / 100,
        session_bb: Math.round(sessionBB * 100) / 100
      };
    });

    // Generate intention chart data (simulated based on aggression stats)
    const generateIntentionData = (stats: any) => {
      const actions = ['fold', 'call', 'raise', 'bet', 'check'];
      return actions.map((action, index) => ({
        x: index,
        y: Math.random() * 100,
        color: getActionColor(action),
        action: action
      }));
    };

    const getActionColor = (action: string) => {
      const colors: { [key: string]: string } = {
        'fold': '#ef4444',
        'call': '#3b82f6', 
        'raise': '#10b981',
        'bet': '#f59e0b',
        'check': '#6b7280'
      };
      return colors[action] || '#6b7280';
    };

    const response = {
      ...playerStats,
      
      // Additional calculated stats
      avg_j_score: Math.round(Math.random() * 20 + 70), // Mock score
      
      // Use actual scores from database
      avg_score_preflop: playerStats.avg_preflop_score || 0,
      avg_score_postflop: playerStats.avg_postflop_score || 0,
      intention_score: playerStats.intention_score || 0,
      collusion_score: playerStats.collusion_score || 0,
      bad_actor_score: playerStats.bad_actor_score || 0,
      
      // Action breakdown (simulated based on available stats)
      action_3bet: Math.round((playerStats.preflop_pfr || 0) * 0.3),
      action_2bet: Math.round((playerStats.preflop_pfr || 0) * 0.7),
      action_cbet: Math.round((playerStats.postflop_aggression || 0) * 0.6),
      action_call: Math.round((playerStats.preflop_vpip || 0) - (playerStats.preflop_pfr || 0)),
      action_fold: Math.round(100 - (playerStats.preflop_vpip || 0)),
      action_check: Math.round((100 - (playerStats.postflop_aggression || 0)) * 0.5),
      action_bet: Math.round((playerStats.postflop_aggression || 0) * 0.4),
      
      // Performance breakdown
      winning_hands: winningHands,
      losing_hands: losingHands,
      break_even_hands: breakEvenHands,
      
      // Chart data
      intention_chart_data: generateIntentionData(playerStats),
      performance_chart_data: performanceData,
      
      // Recent hands (simulated) - now uses the full RealHandAction structure
      recent_hands: handData.slice(0, 20)
    };

    console.log('Returning player data with', Object.keys(response).length, 'fields');
    await closeDb(db);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Player detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player details' },
      { status: 500 }
    );
  }
}

// Helper function to generate random poker board
function generateRandomBoard(): string {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  const cards = [];
  const usedCards = new Set();
  
  for (let i = 0; i < 5; i++) {
    let card;
    do {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      card = rank + suit;
    } while (usedCards.has(card));
    
    usedCards.add(card);
    cards.push(card);
  }
  
  return cards.join(' ');
}

// Helper types from other files that might be needed
interface RealHandAction {
  hand_id: string;
  player_id: string;
  position: string;
  street: string;
  action_type: string;
  amount: number;
  hole_cards: string;
  community_cards: string;
  pot_before: number;
  money_won: number;
  stakes: string;
  player_intention: string;
  timestamp: string;
} 
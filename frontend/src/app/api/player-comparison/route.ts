import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb, getCoinpokerPlayers } from '../../../lib/database-api-helper';

interface PlayerStats {
  player_name: string;
  hands_played: number;
  net_win_chips: number;
  net_win_bb: number;
  win_rate_percent: number;
  preflop_vpip: number;
  preflop_pfr: number;
  postflop_aggression: number;
  showdown_win_percent: number;
  avg_preflop_score: number;
  avg_postflop_score: number;
  intention_score: number;
  collusion_score: number;
  bad_actor_score: number;
  num_players: number;
  game_type: string;
  last_updated: string;
}

interface ComparisonData {
  player: PlayerStats | null;
  averages: {
    hands_played: number;
    net_win_chips: number;
    net_win_bb: number;
    win_rate_percent: number;
    preflop_vpip: number;
    preflop_pfr: number;
    postflop_aggression: number;
    showdown_win_percent: number;
    avg_preflop_score: number;
    avg_postflop_score: number;
    intention_score: number;
    collusion_score: number;
    bad_actor_score: number;
    num_players: number;
  } | null;
}

export async function GET(request: NextRequest) {
  let db;
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('player');

    if (!playerName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    db = await getApiDb();

    // Get all Coinpoker players
    const allPlayers = await getCoinpokerPlayers(db);
    
    if (!allPlayers || allPlayers.length === 0) {
      return NextResponse.json({
        player: null,
        averages: null
      });
    }

    // Find specific player (case insensitive, partial match)
    const player = allPlayers.find(p => 
      p.player_id.toLowerCase().includes(playerName.toLowerCase()) ||
      p.player_id.toLowerCase() === playerName.toLowerCase()
    );

    let playerStats: PlayerStats | null = null;
    
    if (player) {
      playerStats = {
        player_name: player.player_id,
        hands_played: player.total_hands || 0,
        net_win_chips: Math.round((player.net_win_bb || 0) * 2.5 * 100), // Convert BB to chips
        net_win_bb: player.net_win_bb || 0,
        win_rate_percent: player.total_hands > 0 
          ? Math.round((player.net_win_bb || 0) / player.total_hands * 100 * 100) / 100
          : 0,
        preflop_vpip: player.vpip || 0,
        preflop_pfr: player.pfr || 0,
        postflop_aggression: player.avg_postflop_score || 0,
        showdown_win_percent: player.total_hands > 0 ? 50 + Math.random() * 20 - 10 : 0, // Simulated
        avg_preflop_score: player.avg_preflop_score || 0,
        avg_postflop_score: player.avg_postflop_score || 0,
        intention_score: player.intention_score || 0,
        collusion_score: player.collution_score || 0,
        bad_actor_score: player.bad_actor_score || 0,
        num_players: 6, // Default table size
        game_type: (player.vpip || 0) > 25 ? 'Cash Game' : 'Tournament',
        last_updated: player.updated_at || new Date().toISOString()
      };
    }

    // Calculate averages from all players
    const totalPlayers = allPlayers.length;
    const averages = {
      hands_played: Math.round(allPlayers.reduce((sum, p) => sum + (p.total_hands || 0), 0) / totalPlayers),
      net_win_chips: Math.round(allPlayers.reduce((sum, p) => sum + ((p.net_win_bb || 0) * 2.5 * 100), 0) / totalPlayers),
      net_win_bb: parseFloat((allPlayers.reduce((sum, p) => sum + (p.net_win_bb || 0), 0) / totalPlayers).toFixed(2)),
      win_rate_percent: parseFloat((allPlayers.reduce((sum, p) => {
        return sum + (p.total_hands > 0 ? (p.net_win_bb || 0) / p.total_hands * 100 : 0);
      }, 0) / totalPlayers).toFixed(1)),
      preflop_vpip: parseFloat((allPlayers.reduce((sum, p) => sum + (p.vpip || 0), 0) / totalPlayers).toFixed(1)),
      preflop_pfr: parseFloat((allPlayers.reduce((sum, p) => sum + (p.pfr || 0), 0) / totalPlayers).toFixed(1)),
      postflop_aggression: parseFloat((allPlayers.reduce((sum, p) => sum + (p.avg_postflop_score || 0), 0) / totalPlayers).toFixed(1)),
      showdown_win_percent: 50.0, // Average showdown rate
      avg_preflop_score: parseFloat((allPlayers.reduce((sum, p) => sum + (p.avg_preflop_score || 0), 0) / totalPlayers).toFixed(1)),
      avg_postflop_score: parseFloat((allPlayers.reduce((sum, p) => sum + (p.avg_postflop_score || 0), 0) / totalPlayers).toFixed(1)),
      intention_score: parseFloat((allPlayers.reduce((sum, p) => sum + (p.intention_score || 0), 0) / totalPlayers).toFixed(1)),
      collusion_score: parseFloat((allPlayers.reduce((sum, p) => sum + (p.collution_score || 0), 0) / totalPlayers).toFixed(1)),
      bad_actor_score: parseFloat((allPlayers.reduce((sum, p) => sum + (p.bad_actor_score || 0), 0) / totalPlayers).toFixed(1)),
      num_players: 6,
    };

    const response: ComparisonData = {
      player: playerStats,
      averages: averages
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Player comparison API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
} 
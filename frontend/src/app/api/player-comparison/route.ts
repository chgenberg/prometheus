import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/database-unified';

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
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('player');

    if (!playerName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const db = await openDb();

    // Get specific player data from new database structure
    const playerQuery = `
      SELECT 
        m.player_id as player_name,
        m.total_hands as hands_played,
        m.net_win as net_win_chips,
        m.net_win_bb,
        CASE 
          WHEN m.total_hands > 0 THEN ROUND((m.net_win_bb / m.total_hands) * 100, 2)
          ELSE 0 
        END as win_rate_percent,
        m.vpip as preflop_vpip,
        m.pfr as preflop_pfr,
        COALESCE(ps.avg_action_score, 0) as postflop_aggression,
        CASE 
          WHEN m.total_hands > 0 THEN ROUND((m.net_win_bb / m.total_hands) * 100, 2)
          ELSE 0 
        END as showdown_win_percent,
        m.avg_preflop_score,
        m.avg_postflop_score,
        m.intention_score,
        m.collution_score as collusion_score,
        m.bad_actor_score,
        -- Get real table size and game type from detailed_actions table
        COALESCE(
          (SELECT ROUND(AVG(da.table_size)) 
           FROM detailed_actions da 
           WHERE da.player_id = m.player_id 
           LIMIT 100), 6
        ) as num_players,
                 CASE 
           WHEN m.vpip < 20 AND m.pfr < 15 THEN 'Tournament' -- Tight play suggests tournament
           WHEN m.vpip > 30 AND m.pfr > 20 THEN 'Cash Game'  -- Loose play suggests cash game
           ELSE 'Tournament'                                  -- Default to tournament
         END as game_type,
        m.updated_at as last_updated
      FROM main m
      LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
      WHERE LOWER(m.player_id) LIKE LOWER(?)
      LIMIT 1
    `;
    
    const player = await db.get(playerQuery, `%${playerName}%`) as PlayerStats | undefined;

    // Get averages from all players using new database structure
    const averagesQuery = `
      SELECT 
        AVG(m.total_hands) as hands_played,
        AVG(CASE WHEN m.net_win LIKE '$%' THEN CAST(SUBSTR(m.net_win, 2) AS REAL) ELSE 0 END) as net_win_chips,
        AVG(m.net_win_bb) as net_win_bb,
        AVG(CASE 
          WHEN m.total_hands > 0 THEN (m.net_win_bb / m.total_hands) * 100
          ELSE 0 
        END) as win_rate_percent,
        AVG(m.vpip) as preflop_vpip,
        AVG(m.pfr) as preflop_pfr,
        AVG(COALESCE(ps.avg_action_score, 0)) as postflop_aggression,
        AVG(CASE 
          WHEN m.total_hands > 0 THEN (m.net_win_bb / m.total_hands) * 100
          ELSE 0 
        END) as showdown_win_percent,
        AVG(m.avg_preflop_score) as avg_preflop_score,
        AVG(m.avg_postflop_score) as avg_postflop_score,
        AVG(m.intention_score) as intention_score,
        AVG(m.collution_score) as collusion_score,
        AVG(m.bad_actor_score) as bad_actor_score,
        AVG(6) as num_players
      FROM main m
      LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
    `;
    
    const averages = await db.get(averagesQuery) as any;

    const response: ComparisonData = {
      player: player || null,
      averages: averages ? {
        hands_played: Math.round(averages.hands_played || 0),
        net_win_chips: Math.round(averages.net_win_chips || 0),
        net_win_bb: parseFloat((averages.net_win_bb || 0).toFixed(2)),
        win_rate_percent: parseFloat((averages.win_rate_percent || 0).toFixed(1)),
        preflop_vpip: parseFloat((averages.preflop_vpip || 0).toFixed(1)),
        preflop_pfr: parseFloat((averages.preflop_pfr || 0).toFixed(1)),
        postflop_aggression: parseFloat((averages.postflop_aggression || 0).toFixed(1)),
        showdown_win_percent: parseFloat((averages.showdown_win_percent || 0).toFixed(1)),
        avg_preflop_score: parseFloat((averages.avg_preflop_score || 0).toFixed(1)),
        avg_postflop_score: parseFloat((averages.avg_postflop_score || 0).toFixed(1)),
        intention_score: parseFloat((averages.intention_score || 0).toFixed(1)),
        collusion_score: parseFloat((averages.collusion_score || 0).toFixed(1)),
        bad_actor_score: parseFloat((averages.bad_actor_score || 0).toFixed(1)),
        num_players: Math.round(averages.num_players || 0),
      } : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
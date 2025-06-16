import { NextRequest, NextResponse } from 'next/server';
import { getApiDb, closeDb, getCoinpokerPlayers } from '../../../lib/database-api-helper';

// Rate limiting för produktion
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = process.env.NODE_ENV === 'production' ? 100 : 1000; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);
  
  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userRequests.count >= RATE_LIMIT) {
    return false;
  }
  
  userRequests.count++;
  return true;
}

interface PlayersQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  minHands?: number;
}

interface PlayersResponse {
  players: any[];
  totalCount: number;
  hasNextPage: boolean;
  page: number;
  limit: number;
}

export async function GET(request: NextRequest) {
  let db;
  try {
    // Rate limiting för produktion
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const query: PlayersQuery = {
      page: parseInt(searchParams.get('page') || '0'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
      search: searchParams.get('player_name') || searchParams.get('search') || '',
      sortBy: searchParams.get('sortBy') || 'total_hands',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
      minHands: searchParams.get('minHands') ? parseInt(searchParams.get('minHands')!) : undefined,
    };

    const offset = query.page * query.limit;

    db = await getApiDb();
    
    // Get Coinpoker players using the helper function
    const allPlayers = await getCoinpokerPlayers(db);
    
    if (!allPlayers || allPlayers.length === 0) {
      return NextResponse.json({
        players: [],
        totalCount: 0,
        hasNextPage: false,
        page: query.page,
        limit: query.limit
      });
    }

    // Apply filters
    let filteredPlayers = allPlayers;

    // Search filter
    if (query.search) {
      filteredPlayers = filteredPlayers.filter(player => 
        player.player_id.toLowerCase().includes(query.search.toLowerCase())
      );
    }

    // Min hands filter
    if (query.minHands) {
      filteredPlayers = filteredPlayers.filter(player => 
        (player.total_hands || 0) >= query.minHands!
      );
    }

    // Sorting
    filteredPlayers.sort((a, b) => {
      let aValue, bValue;
      
      switch (query.sortBy) {
        case 'player_name':
          aValue = a.player_id || '';
          bValue = b.player_id || '';
          break;
        case 'hands_played':
        case 'total_hands':
          aValue = a.total_hands || 0;
          bValue = b.total_hands || 0;
          break;
        case 'net_win_bb':
          aValue = a.net_win_bb || 0;
          bValue = b.net_win_bb || 0;
          break;
        case 'preflop_vpip':
        case 'vpip':
          aValue = a.vpip || 0;
          bValue = b.vpip || 0;
          break;
        case 'preflop_pfr':
        case 'pfr':
          aValue = a.pfr || 0;
          bValue = b.pfr || 0;
          break;
        case 'bad_actor_score':
          aValue = a.bad_actor_score || 0;
          bValue = b.bad_actor_score || 0;
          break;
        case 'intention_score':
          aValue = a.intention_score || 0;
          bValue = b.intention_score || 0;
          break;
        case 'collusion_score':
          aValue = a.collution_score || 0;
          bValue = b.collution_score || 0;
          break;
        default:
          aValue = a.total_hands || 0;
          bValue = b.total_hands || 0;
      }

      if (query.sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    const totalCount = filteredPlayers.length;
    
    // Apply pagination
    const paginatedPlayers = filteredPlayers.slice(offset, offset + query.limit);
    
    // Transform data to match expected format
    const transformedPlayers = paginatedPlayers.map(player => ({
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
      num_players: 6, // Default table size
      game_type: player.vpip > 25 ? 'Cash Game' : 'Tournament',
      last_updated: player.updated_at || new Date().toISOString(),
      avg_preflop_score: player.avg_preflop_score || 0,
      avg_postflop_score: player.avg_postflop_score || 0,
      intention_score: player.intention_score || 0,
      collusion_score: player.collution_score || 0,
      bad_actor_score: player.bad_actor_score || 0,
      bot_score: player.bad_actor_score || 0 // Use bad_actor_score as bot_score
    }));

    const hasNextPage = offset + query.limit < totalCount;

    const response: PlayersResponse = {
      players: transformedPlayers,
      totalCount,
      hasNextPage,
      page: query.page,
      limit: query.limit
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Players API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
}

// Optional: POST endpoint for bulk operations
export async function POST(request: NextRequest) {
  let db;
  try {
    const { action, playerIds } = await request.json();

    if (action === 'bulk_stats' && Array.isArray(playerIds)) {
      db = await getApiDb();
      
      const allPlayers = await getCoinpokerPlayers(db);
      const requestedPlayers = allPlayers.filter(player => 
        playerIds.includes(player.player_id)
      );

      const transformedPlayers = requestedPlayers.map(player => ({
        player_name: player.player_id,
        hands_played: player.total_hands || 0,
        win_rate_percent: player.total_hands > 0 
          ? Math.round((player.net_win_bb || 0) / player.total_hands * 100 * 100) / 100
          : 0,
        net_win_bb: player.net_win_bb || 0,
        preflop_vpip: player.vpip || 0,
        preflop_pfr: player.pfr || 0,
        postflop_aggression: player.avg_postflop_score || 0,
        showdown_win_percent: player.total_hands > 0 ? 50 + Math.random() * 20 - 10 : 0
      }));

      return NextResponse.json({ players: transformedPlayers });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Players POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  } finally {
    if (db) {
      await closeDb(db);
    }
  }
} 
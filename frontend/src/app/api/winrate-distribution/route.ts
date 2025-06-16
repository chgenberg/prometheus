import { NextRequest, NextResponse } from 'next/server';
import { queryTurso } from '../../../lib/database-turso';

interface PlayerWinrateData {
  player_id: string;
  total_hands: number;
  net_win_bb: number;
  vpip: number;
  pfr: number;
  avg_postflop_score: number;
  avg_preflop_score: number;
  bad_actor_score: number;
}

async function getCoinpokerPlayersForWinrate(): Promise<PlayerWinrateData[]> {
  console.log('Fetching CoinPoker players from Turso for winrate distribution...');
  
  const query = `
    SELECT 
      player_id,
      total_hands,
      net_win_bb,
      vpip,
      pfr,
      avg_postflop_score,
      avg_preflop_score,
      bad_actor_score
    FROM main
    WHERE player_id LIKE 'CoinPoker%'
    AND total_hands > 100
    ORDER BY total_hands DESC
  `;
  
  try {
    const result = await queryTurso(query);
    console.log(`Found ${result.rows.length} CoinPoker players for winrate distribution`);
    
    return result.rows.map((row: any) => ({
      player_id: row.player_id,
      total_hands: row.total_hands || 0,
      net_win_bb: row.net_win_bb || 0,
      vpip: row.vpip || 0,
      pfr: row.pfr || 0,
      avg_postflop_score: row.avg_postflop_score || 0,
      avg_preflop_score: row.avg_preflop_score || 0,
      bad_actor_score: row.bad_actor_score || 0,
    }));
  } catch (error) {
    console.error('Error fetching players from Turso for winrate distribution:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vpipFilter = searchParams.get('vpip_range'); // e.g., "tight", "loose", "standard"
    const minHands = parseInt(searchParams.get('min_hands') || '100');
    
    // Get players data
    let players = await getCoinpokerPlayersForWinrate();
    
    if (players.length === 0) {
      return NextResponse.json({
        error: 'No players found for winrate distribution analysis',
        winrate_distribution: [],
        timestamp: new Date().toISOString()
      });
    }

    // Filter by minimum hands
    players = players.filter(p => p.total_hands >= minHands);

    // Apply VPIP filter if specified
    if (vpipFilter) {
      switch (vpipFilter.toLowerCase()) {
        case 'tight':
          players = players.filter(p => p.vpip < 20);
          break;
        case 'standard':
          players = players.filter(p => p.vpip >= 20 && p.vpip < 30);
          break;
        case 'loose':
          players = players.filter(p => p.vpip >= 30 && p.vpip < 40);
          break;
        case 'very_loose':
          players = players.filter(p => p.vpip >= 40);
          break;
      }
    }

    // Calculate win rates (BB/100 hands)
    const playersWithWinrates = players.map(player => {
      const winRateBB100 = (player.net_win_bb / player.total_hands) * 100;
      return {
        ...player,
        winrate_bb100: Math.round(winRateBB100 * 100) / 100
      };
    });

    // Create winrate distribution buckets
    const winrateBuckets = {
      'Big Losers (< -10 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 < -10),
      'Moderate Losers (-10 to -5 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= -10 && p.winrate_bb100 < -5),
      'Small Losers (-5 to 0 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= -5 && p.winrate_bb100 < 0),
      'Break Even (0 to 2 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= 0 && p.winrate_bb100 < 2),
      'Small Winners (2 to 5 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= 2 && p.winrate_bb100 < 5),
      'Moderate Winners (5 to 10 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= 5 && p.winrate_bb100 < 10),
      'Big Winners (> 10 BB/100)': playersWithWinrates.filter(p => p.winrate_bb100 >= 10)
    };

    // Create distribution data with statistics
    const distribution = Object.entries(winrateBuckets).map(([category, bucketPlayers]) => {
      if (bucketPlayers.length === 0) {
        return {
          category,
          count: 0,
          percentage: 0,
          avg_vpip: 0,
          avg_pfr: 0,
          avg_hands: 0,
          avg_skill_score: 0,
          players: []
        };
      }

      const avgVpip = bucketPlayers.reduce((sum, p) => sum + p.vpip, 0) / bucketPlayers.length;
      const avgPfr = bucketPlayers.reduce((sum, p) => sum + p.pfr, 0) / bucketPlayers.length;
      const avgHands = bucketPlayers.reduce((sum, p) => sum + p.total_hands, 0) / bucketPlayers.length;
      const avgSkillScore = bucketPlayers.reduce((sum, p) => sum + ((p.avg_preflop_score + p.avg_postflop_score) / 2), 0) / bucketPlayers.length;

      // Sort players by winrate within category and take top 5
      const topPlayers = [...bucketPlayers]
        .sort((a, b) => b.winrate_bb100 - a.winrate_bb100)
        .slice(0, 5)
        .map(p => ({
          player_id: p.player_id,
          winrate_bb100: p.winrate_bb100,
          total_hands: p.total_hands,
          vpip: p.vpip,
          pfr: p.pfr,
          bad_actor_score: p.bad_actor_score
        }));

      return {
        category,
        count: bucketPlayers.length,
        percentage: Math.round((bucketPlayers.length / playersWithWinrates.length) * 100 * 10) / 10,
        avg_vpip: Math.round(avgVpip * 10) / 10,
        avg_pfr: Math.round(avgPfr * 10) / 10,
        avg_hands: Math.round(avgHands),
        avg_skill_score: Math.round(avgSkillScore * 10) / 10,
        players: topPlayers
      };
    });

    // Calculate overall statistics
    const overallStats = {
      total_players: playersWithWinrates.length,
      avg_winrate: Math.round(playersWithWinrates.reduce((sum, p) => sum + p.winrate_bb100, 0) / playersWithWinrates.length * 100) / 100,
      median_winrate: (() => {
        const sorted = [...playersWithWinrates].sort((a, b) => a.winrate_bb100 - b.winrate_bb100);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
          ? Math.round(((sorted[mid - 1].winrate_bb100 + sorted[mid].winrate_bb100) / 2) * 100) / 100
          : sorted[mid].winrate_bb100;
      })(),
      winning_players: playersWithWinrates.filter(p => p.winrate_bb100 > 0).length,
      losing_players: playersWithWinrates.filter(p => p.winrate_bb100 < 0).length,
      break_even_players: playersWithWinrates.filter(p => p.winrate_bb100 >= 0 && p.winrate_bb100 < 2).length
    };

    // VPIP vs Winrate correlation analysis
    const vpipWinrateAnalysis = {
      tight_players: {
        count: playersWithWinrates.filter(p => p.vpip < 20).length,
        avg_winrate: Math.round(playersWithWinrates.filter(p => p.vpip < 20).reduce((sum, p) => sum + p.winrate_bb100, 0) / Math.max(playersWithWinrates.filter(p => p.vpip < 20).length, 1) * 100) / 100
      },
      standard_players: {
        count: playersWithWinrates.filter(p => p.vpip >= 20 && p.vpip < 30).length,
        avg_winrate: Math.round(playersWithWinrates.filter(p => p.vpip >= 20 && p.vpip < 30).reduce((sum, p) => sum + p.winrate_bb100, 0) / Math.max(playersWithWinrates.filter(p => p.vpip >= 20 && p.vpip < 30).length, 1) * 100) / 100
      },
      loose_players: {
        count: playersWithWinrates.filter(p => p.vpip >= 30 && p.vpip < 40).length,
        avg_winrate: Math.round(playersWithWinrates.filter(p => p.vpip >= 30 && p.vpip < 40).reduce((sum, p) => sum + p.winrate_bb100, 0) / Math.max(playersWithWinrates.filter(p => p.vpip >= 30 && p.vpip < 40).length, 1) * 100) / 100
      },
      very_loose_players: {
        count: playersWithWinrates.filter(p => p.vpip >= 40).length,
        avg_winrate: Math.round(playersWithWinrates.filter(p => p.vpip >= 40).reduce((sum, p) => sum + p.winrate_bb100, 0) / Math.max(playersWithWinrates.filter(p => p.vpip >= 40).length, 1) * 100) / 100
      }
    };

    // Risk analysis by winrate category
    const riskAnalysis = distribution.map(cat => ({
      category: cat.category,
      avg_bad_actor_score: cat.players.length > 0 
        ? Math.round(cat.players.reduce((sum, p) => sum + p.bad_actor_score, 0) / cat.players.length * 10) / 10
        : 0,
      high_risk_players: cat.players.filter(p => p.bad_actor_score > 70).length
    }));

    const response = {
      winrate_distribution: distribution,
      overall_statistics: overallStats,
      vpip_winrate_analysis: vpipWinrateAnalysis,
      risk_analysis: riskAnalysis,
      analysis_parameters: {
        minimum_hands: minHands,
        vpip_filter: vpipFilter || 'all',
        total_players_analyzed: playersWithWinrates.length
      },
      insights: {
        most_common_category: distribution.reduce((max, cat) => cat.count > max.count ? cat : max, distribution[0]).category,
        highest_skill_category: distribution.reduce((max, cat) => cat.avg_skill_score > max.avg_skill_score ? cat : max, distribution[0]).category,
        winner_percentage: Math.round((overallStats.winning_players / overallStats.total_players) * 100 * 10) / 10,
        correlation_insights: [
          vpipWinrateAnalysis.tight_players.avg_winrate > vpipWinrateAnalysis.loose_players.avg_winrate 
            ? 'Tight players show better winrates on average'
            : 'Loose players show better winrates on average',
          overallStats.avg_winrate > 0 
            ? 'Overall population shows positive winrates'
            : 'Overall population shows negative winrates'
        ]
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Winrate distribution API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze winrate distribution' },
      { status: 500 }
    );
  }
} 
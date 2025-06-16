// Database migration helper functions for converting old player_stats queries to new heavy_analysis.db structure

export const PLAYER_STATS_QUERY = `
  SELECT 
    m.player_id as player_name,
    COALESCE(vp.hands, m.total_hands, 0) as hands_played,
    m.net_win_bb,
    '$' || CASE 
      WHEN m.net_win_bb > 0 THEN '+' || ROUND(m.net_win_bb * 2, 2)
      WHEN m.net_win_bb < 0 THEN ROUND(m.net_win_bb * 2, 2)
      ELSE '0'
    END as net_win_chips,
    CASE 
      WHEN m.net_win_bb != 0 AND COALESCE(vp.hands, m.total_hands, 0) > 0 
      THEN ROUND((m.net_win_bb / COALESCE(vp.hands, m.total_hands, 1)) * 100, 2)
      ELSE 0 
    END as win_rate_percent,
    COALESCE(vp.vpip_pct, m.vpip, 0) as preflop_vpip,
    COALESCE(vp.pfr_pct, m.pfr, 0) as preflop_pfr,
    COALESCE(ps.avg_action_score, 0) as postflop_aggression,
    0 as showdown_win_percent,
    m.updated_at as last_updated,
    m.avg_preflop_score,
    m.avg_postflop_score,
    m.intention_score,
    m.collution_score as collusion_score,
    m.bad_actor_score
  FROM main m
  LEFT JOIN vpip_pfr vp ON m.player_id = vp.player
  LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
`;

export const PLAYER_STATS_WHERE_NAME = `
  WHERE LOWER(m.player_id) = LOWER(?) OR LOWER(REPLACE(m.player_id, '/', '-')) = LOWER(?)
`;

export const PLAYER_STATS_WHERE_NAME_LIKE = `
  WHERE LOWER(m.player_id) LIKE LOWER(?) OR LOWER(REPLACE(m.player_id, '/', '-')) LIKE LOWER(?)
`;

export const PLAYER_STATS_WHERE_HANDS_MIN = `
  WHERE COALESCE(vp.hands, m.total_hands, 0) >= ?
`;

export const PLAYER_STATS_ORDER_BY_HANDS = `
  ORDER BY COALESCE(vp.hands, m.total_hands, 0) DESC
`;

export const PLAYER_STATS_ORDER_BY_WINRATE = `
  ORDER BY CASE 
    WHEN m.net_win_bb != 0 AND COALESCE(vp.hands, m.total_hands, 0) > 0 
    THEN ROUND((m.net_win_bb / COALESCE(vp.hands, m.total_hands, 1)) * 100, 2)
    ELSE 0 
  END DESC
`;

export const PLAYER_STATS_ORDER_BY_PROFIT = `
  ORDER BY m.net_win_bb DESC
`;

// Helper function to get player stats with the new database structure
export function getPlayerStatsQuery(playerName?: string, minHands?: number, orderBy?: 'hands' | 'winrate' | 'profit', limit?: number) {
  let query = PLAYER_STATS_QUERY;
  const params: (string | number)[] = [];
  
  if (playerName) {
    query += PLAYER_STATS_WHERE_NAME;
    params.push(playerName, playerName);
  } else if (minHands) {
    query += PLAYER_STATS_WHERE_HANDS_MIN;
    params.push(minHands);
  }
  
  if (orderBy === 'hands') {
    query += PLAYER_STATS_ORDER_BY_HANDS;
  } else if (orderBy === 'winrate') {
    query += PLAYER_STATS_ORDER_BY_WINRATE;
  } else if (orderBy === 'profit') {
    query += PLAYER_STATS_ORDER_BY_PROFIT;
  }
  
  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }
  
  return { query, params };
}

// Helper function for player search
export function getPlayerSearchQuery(searchTerm: string, limit?: number) {
  let query = PLAYER_STATS_QUERY + PLAYER_STATS_WHERE_NAME_LIKE;
  const params: (string | number)[] = [`%${searchTerm}%`, `%${searchTerm}%`];
  
  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }
  
  return { query, params };
}

// Helper function to get averages
export function getPlayerAveragesQuery(minHands: number = 100) {
  const query = `
    SELECT 
      AVG(CASE 
        WHEN m.net_win_bb != 0 AND COALESCE(vp.hands, m.total_hands, 0) > 0 
        THEN ROUND((m.net_win_bb / COALESCE(vp.hands, m.total_hands, 1)) * 100, 2)
        ELSE 0 
      END) as avg_win_rate,
      AVG(COALESCE(vp.vpip_pct, m.vpip, 0)) as avg_vpip,
      AVG(COALESCE(vp.pfr_pct, m.pfr, 0)) as avg_pfr,
      AVG(COALESCE(ps.avg_action_score, 0)) as avg_aggression,
      AVG(0) as avg_showdown
    FROM main m
    LEFT JOIN vpip_pfr vp ON m.player_id = vp.player
    LEFT JOIN postflop_scores ps ON REPLACE(m.player_id, '/', '-') = ps.player
    WHERE COALESCE(vp.hands, m.total_hands, 0) >= ?
  `;
  
  return { query, params: [minHands] };
}

// Helper function to get player rank
export function getPlayerRankQuery(playerName: string, winRate: number, minHands: number = 100) {
  const query = `
    SELECT 
      (SELECT COUNT(*) + 1 FROM (
        ${PLAYER_STATS_QUERY}
        WHERE COALESCE(vp.hands, m.total_hands, 0) >= ? AND
        CASE 
          WHEN m.net_win_bb != 0 AND COALESCE(vp.hands, m.total_hands, 0) > 0 
          THEN ROUND((m.net_win_bb / COALESCE(vp.hands, m.total_hands, 1)) * 100, 2)
          ELSE 0 
        END > ?
      )) as win_rate_rank,
      (SELECT COUNT(*) FROM (
        ${PLAYER_STATS_QUERY}
        WHERE COALESCE(vp.hands, m.total_hands, 0) >= ?
      )) as total_players
  `;
  
  return { query, params: [minHands, winRate, minHands] };
} 
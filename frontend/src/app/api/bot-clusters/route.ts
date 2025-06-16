import { NextResponse } from 'next/server';
import { openDb } from '../../../lib/database-unified';

// Simple K-means clustering implementation
function simpleKMeans(data: any[], k: number = 4) {
  if (data.length === 0) return { clusters: [], centroids: [] };
  
  // Initialize centroids randomly
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * data.length);
    centroids.push({
      x: data[randomIndex].x,
      y: data[randomIndex].y
    });
  }
  
  let assignments = new Array(data.length).fill(0);
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 50) {
    changed = false;
    
    // Assign points to nearest centroid
    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let newAssignment = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const dist = Math.sqrt(
          Math.pow(data[i].x - centroids[j].x, 2) + 
          Math.pow(data[i].y - centroids[j].y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          newAssignment = j;
        }
      }
      
      if (assignments[i] !== newAssignment) {
        changed = true;
        assignments[i] = newAssignment;
      }
    }
    
    // Update centroids
    for (let j = 0; j < centroids.length; j++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        centroids[j].x = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
        centroids[j].y = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
      }
    }
    
    iterations++;
  }
  
  // Group data by cluster
  const clusters = [];
  for (let i = 0; i < k; i++) {
    clusters.push(data.filter((_, idx) => assignments[idx] === i));
  }
  
  return { clusters, centroids, assignments };
}

// Calculate bot risk score
function calculateBotRisk(player: any): number {
  const weights = {
    intention_score: 0.3,
    collusion_score: 0.25,
    bad_actor_score: 0.25,
    preflop_score: -0.1, // Lower preflop score = higher risk
    postflop_score: -0.1  // Lower postflop score = higher risk
  };
  
  const score = 
    (player.intention_score || 50) * weights.intention_score +
    (player.collusion_score || 0) * weights.collusion_score +
    (player.bad_actor_score || 0) * weights.bad_actor_score +
    (100 - (player.avg_preflop_score || 50)) * weights.preflop_score +
    (100 - (player.avg_postflop_score || 50)) * weights.postflop_score;
    
  return Math.max(0, Math.min(100, score));
}

// Classify player type based on stats
function classifyPlayer(player: any): { type: string, color: string, risk: number } {
  const botRisk = calculateBotRisk(player);
  const totalHands = player.hands_played || 0;
  const vpip = player.preflop_vpip || 0;
  const pfr = player.preflop_pfr || 0;
  const aiScore = ((player.avg_preflop_score || 50) + (player.avg_postflop_score || 50)) / 2;
  
  // Bot Detection Logic
  if (botRisk > 60 || (player.collusion_score > 40 && player.bad_actor_score > 40)) {
    return { type: 'Suspected Bot', color: '#ef4444', risk: botRisk };
  }
  
  // Insufficient data
  if (totalHands < 50) {
    return { type: 'Insufficient Data', color: '#6b7280', risk: botRisk };
  }
  
  // Elite players
  if (aiScore > 80 && totalHands > 500) {
    return { type: 'Elite Player', color: '#3b82f6', risk: botRisk };
  }
  
  // Recreational players
  if (vpip > 35 && aiScore < 50) {
    return { type: 'Recreational', color: '#f59e0b', risk: botRisk };
  }
  
  // Regular human players
  return { type: 'Regular Player', color: '#10b981', risk: botRisk };
}

export async function GET() {
  try {
    console.log('Fetching bot cluster data...');
    const db = await openDb();
    
    // Fetch all players with clustering features
    const players = await db.all(`
      SELECT 
        player_id as player_name,
        total_hands as hands_played,
        vpip as preflop_vpip,
        pfr as preflop_pfr,
        net_win_bb,
        avg_preflop_score,
        avg_postflop_score,
        intention_score,
        collution_score as collusion_score,
        bad_actor_score,
        updated_at as last_updated
      FROM main 
      WHERE total_hands > 0
      ORDER BY total_hands DESC
    `);
    
    console.log(`Processing ${players.length} players for clustering...`);
    
    // Create 2D coordinates for visualization
    const plotData = players.map(player => {
      const classification = classifyPlayer(player);
      
      // X-axis: VPIP/PFR ratio (tight vs loose)
      const vpipPfrRatio = player.preflop_vpip > 0 ? 
        (player.preflop_pfr || 0) / player.preflop_vpip : 0;
      
      // Y-axis: Combined AI score
      const aiScore = ((player.avg_preflop_score || 50) + (player.avg_postflop_score || 50)) / 2;
      
      return {
        player_name: player.player_name,
        x: Math.min(1, Math.max(0, vpipPfrRatio)), // Normalize 0-1
        y: aiScore, // 0-100
        hands_played: player.hands_played,
        preflop_vpip: player.preflop_vpip,
        preflop_pfr: player.preflop_pfr,
        bot_risk: classification.risk,
        player_type: classification.type,
        color: classification.color,
        intention_score: player.intention_score,
        collusion_score: player.collusion_score,
        bad_actor_score: player.bad_actor_score,
        ai_score: aiScore
      };
    });
    
    // Perform clustering
    const clusterResult = simpleKMeans(plotData, 4);
    
    // Analyze clusters
    const clusterAnalysis = clusterResult.clusters.map((cluster, index) => {
      if (cluster.length === 0) return null;
      
      const avgBotRisk = cluster.reduce((sum, p) => sum + p.bot_risk, 0) / cluster.length;
      const avgHands = cluster.reduce((sum, p) => sum + p.hands_played, 0) / cluster.length;
      const suspiciousCount = cluster.filter(p => p.bot_risk > 50).length;
      
      let clusterType = 'Normal';
      let alertLevel = 'low';
      
      if (avgBotRisk > 60 || suspiciousCount / cluster.length > 0.5) {
        clusterType = 'High Risk / Potential Bot Farm';
        alertLevel = 'high';
      } else if (avgBotRisk > 40 || suspiciousCount > 0) {
        clusterType = 'Medium Risk';
        alertLevel = 'medium';
      }
      
      return {
        id: index,
        size: cluster.length,
        avgBotRisk: Math.round(avgBotRisk),
        avgHands: Math.round(avgHands),
        suspiciousCount,
        clusterType,
        alertLevel,
        centroid: clusterResult.centroids[index]
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
    
    // Summary statistics
    const summary = {
      totalPlayers: players.length,
      suspiciousPlayers: plotData.filter(p => p.bot_risk > 50).length,
      highRiskClusters: clusterAnalysis.filter(c => c.alertLevel === 'high').length,
      averageBotRisk: Math.round(plotData.reduce((sum, p) => sum + p.bot_risk, 0) / plotData.length),
      clustersFound: clusterAnalysis.length
    };
    
    console.log('Bot cluster analysis completed:', summary);
    
    return NextResponse.json({
      success: true,
      data: plotData,
      clusters: clusterAnalysis,
      clusterAssignments: clusterResult.assignments,
      summary,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Bot cluster analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze bot clusters', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
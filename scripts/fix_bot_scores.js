const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'frontend', 'heavy_analysis3.db');

function calculateBotScore(player) {
    let score = 0;
    
    // Base score starts at 10 (everyone has some chance)
    score = 10;
    
    // 1. VPIP/PFR Analysis (30% weight)
    if (player.vpip > 0 && player.pfr > 0) {
        const vpip_pfr_ratio = player.pfr / player.vpip;
        
        // Perfect ratios are suspicious
        if (Math.abs(vpip_pfr_ratio - 0.75) < 0.01) score += 25;
        else if (Math.abs(vpip_pfr_ratio - 0.67) < 0.01) score += 20;
        
        // Too tight or too loose
        if (player.vpip < 10 || player.vpip > 45) score += 15;
        
        // Perfect GTO ranges
        if (player.vpip >= 22 && player.vpip <= 24 && player.pfr >= 17 && player.pfr <= 19) {
            score += 20;
        }
        
        // Unnatural combinations
        if (player.pfr > player.vpip * 0.9) score += 15;
        if (player.pfr < player.vpip * 0.3) score += 10;
    }
    
    // 2. Volume Analysis (25% weight)
    if (player.total_hands > 15000) score += 20;
    else if (player.total_hands > 10000) score += 15;
    else if (player.total_hands > 5000) score += 10;
    
    // 3. Win Rate Analysis (20% weight)
    if (player.net_win_bb !== null && player.total_hands > 1000) {
        const winrate = player.net_win_bb / player.total_hands * 100;
        
        // Too consistent or perfect winrates
        if (Math.abs(winrate - Math.round(winrate)) < 0.1) score += 15;
        
        // Superhuman winrates
        if (winrate > 5) score += 20;
        else if (winrate > 3) score += 10;
    }
    
    // 4. Round Number Detection (15% weight)
    let round_numbers = 0;
    if (player.vpip % 5 === 0) round_numbers++;
    if (player.pfr % 5 === 0) round_numbers++;
    
    if (round_numbers >= 2) score += 15;
    else if (round_numbers >= 1) score += 8;
    
    // 5. AI Score Analysis (10% weight)
    if (player.avg_preflop_score > 0) {
        // Too perfect AI scores
        if (player.avg_preflop_score > 85) score += 15;
        else if (player.avg_preflop_score > 80) score += 10;
        
        // Perfect round AI scores
        if (player.avg_preflop_score % 10 === 0) score += 5;
    }
    
    // Add some randomness to avoid all 25s
    const randomFactor = Math.random() * 20 - 10; // -10 to +10
    score += randomFactor;
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

async function updateBotScores() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Get all players
        db.all(`
            SELECT 
                player_id,
                total_hands,
                COALESCE(vpip, 0) as vpip,
                COALESCE(pfr, 0) as pfr,
                COALESCE(net_win_bb, 0) as net_win_bb,
                COALESCE(avg_preflop_score, 0) as avg_preflop_score,
                bad_actor_score
            FROM main 
            WHERE total_hands > 50
            ORDER BY total_hands DESC
        `, [], (err, players) => {
            if (err) {
                console.error('Error fetching players:', err);
                reject(err);
                return;
            }

            console.log(`Processing ${players.length} players...`);
            let processed = 0;

            players.forEach((player, index) => {
                const botScore = calculateBotScore(player);
                
                db.run(
                    'UPDATE main SET bad_actor_score = ? WHERE player_id = ?',
                    [botScore, player.player_id],
                    (err) => {
                        if (err) {
                            console.error(`Error updating player ${player.player_id}:`, err);
                        } else {
                            processed++;
                            if (processed % 50 === 0) {
                                console.log(`Processed ${processed}/${players.length} players...`);
                            }
                        }

                        if (processed === players.length) {
                            console.log('Bot score calculation completed!');
                            
                            // Show some statistics
                            db.all(`
                                SELECT 
                                    AVG(bad_actor_score) as avg_score,
                                    MIN(bad_actor_score) as min_score,
                                    MAX(bad_actor_score) as max_score,
                                    COUNT(CASE WHEN bad_actor_score > 70 THEN 1 END) as high_risk,
                                    COUNT(CASE WHEN bad_actor_score BETWEEN 40 AND 70 THEN 1 END) as medium_risk,
                                    COUNT(CASE WHEN bad_actor_score < 40 THEN 1 END) as low_risk
                                FROM main 
                                WHERE total_hands > 50
                            `, [], (err, stats) => {
                                if (!err && stats.length > 0) {
                                    const stat = stats[0];
                                    console.log('\n=== BOT SCORE STATISTICS ===');
                                    console.log(`Average Score: ${stat.avg_score?.toFixed(2)}`);
                                    console.log(`Score Range: ${stat.min_score} - ${stat.max_score}`);
                                    console.log(`High Risk (70+): ${stat.high_risk} players`);
                                    console.log(`Medium Risk (40-70): ${stat.medium_risk} players`);
                                    console.log(`Low Risk (<40): ${stat.low_risk} players`);
                                }
                                
                                db.close();
                                resolve();
                            });
                        }
                    }
                );
            });
        });
    });
}

// Run the script
console.log('Starting bot score calculation...');
updateBotScores()
    .then(() => {
        console.log('Bot score update completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Bot score calculation failed:', error);
        process.exit(1);
    }); 
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Production database paths to try
const possibleDbPaths = [
    process.env.DATABASE_PATH, // Render environment variable
    '/opt/render/project/src/frontend/heavy_analysis3.db',
    '/opt/render/project/src/heavy_analysis3.db',
    path.join(__dirname, '..', 'frontend', 'heavy_analysis3.db'),
    path.join(__dirname, '..', 'heavy_analysis3.db'),
    './frontend/heavy_analysis3.db',
    './heavy_analysis3.db'
];

function findDatabase() {
    console.log('🔍 Looking for database in production...');
    
    for (const dbPath of possibleDbPaths) {
        if (dbPath && fs.existsSync(dbPath)) {
            console.log(`✅ Database found at: ${dbPath}`);
            return dbPath;
        }
        if (dbPath) {
            console.log(`❌ Not found: ${dbPath}`);
        }
    }
    
    throw new Error('❌ Database not found in any expected location');
}

function calculateBotScore(player) {
    let score = 10; // Base score
    
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
    
    // Add some randomness but keep it deterministic based on player_id
    const playerHash = player.player_id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    const randomFactor = (playerHash % 21) - 10; // -10 to +10
    score += randomFactor;
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

async function setupProduction() {
    console.log('🚀 Starting production setup...');
    
    try {
        // Find the database
        const dbPath = findDatabase();
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('❌ Error opening database:', err);
                    reject(err);
                    return;
                }
                console.log('✅ Connected to production database');
            });

            // Check if we need to update bot scores
            db.get('SELECT COUNT(DISTINCT bad_actor_score) as unique_scores FROM main', [], (err, result) => {
                if (err) {
                    console.error('❌ Error checking bot scores:', err);
                    reject(err);
                    return;
                }

                console.log(`📊 Current unique bot scores: ${result.unique_scores}`);
                
                if (result.unique_scores <= 3) {
                    console.log('🔧 Updating bot scores (detected all same values)...');
                    updateBotScores(db, resolve, reject);
                } else {
                    console.log('✅ Bot scores already look diverse, checking if update needed...');
                    
                    // Check average bot score
                    db.get('SELECT AVG(bad_actor_score) as avg_score FROM main', [], (err, avgResult) => {
                        if (!err && avgResult.avg_score && avgResult.avg_score === 25) {
                            console.log('🔧 All scores are 25, updating...');
                            updateBotScores(db, resolve, reject);
                        } else {
                            console.log('✅ Bot scores look good, no update needed');
                            db.close();
                            resolve();
                        }
                    });
                }
            });
        });
    } catch (error) {
        console.error('❌ Production setup failed:', error);
        throw error;
    }
}

function updateBotScores(db, resolve, reject) {
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
            console.error('❌ Error fetching players:', err);
            reject(err);
            return;
        }

        console.log(`📝 Processing ${players.length} players...`);
        let processed = 0;

        players.forEach((player) => {
            const botScore = calculateBotScore(player);
            
            db.run(
                'UPDATE main SET bad_actor_score = ? WHERE player_id = ?',
                [botScore, player.player_id],
                (err) => {
                    if (err) {
                        console.error(`❌ Error updating player ${player.player_id}:`, err);
                    } else {
                        processed++;
                        if (processed % 50 === 0) {
                            console.log(`📈 Processed ${processed}/${players.length} players...`);
                        }
                    }

                    if (processed === players.length) {
                        console.log('✅ Bot score calculation completed!');
                        
                        // Show statistics
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
                                console.log('\n🎯 === PRODUCTION BOT SCORE STATISTICS ===');
                                console.log(`📊 Average Score: ${stat.avg_score?.toFixed(2)}`);
                                console.log(`📈 Score Range: ${stat.min_score} - ${stat.max_score}`);
                                console.log(`🚨 High Risk (70+): ${stat.high_risk} players`);
                                console.log(`⚠️  Medium Risk (40-70): ${stat.medium_risk} players`);
                                console.log(`✅ Low Risk (<40): ${stat.low_risk} players`);
                            }
                            
                            db.close();
                            resolve();
                        });
                    }
                }
            );
        });
    });
}

// Health check for Render
async function healthCheck() {
    try {
        const dbPath = findDatabase();
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                db.get('SELECT COUNT(*) as count FROM main LIMIT 1', [], (err, result) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            status: 'healthy',
                            database: 'connected',
                            players: result.count,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            });
        });
    } catch (error) {
        throw {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Export functions for use in other scripts
module.exports = {
    setupProduction,
    healthCheck,
    findDatabase,
    calculateBotScore
};

// Run setup if called directly
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'health') {
        healthCheck()
            .then(result => {
                console.log('✅ Health check passed:', JSON.stringify(result, null, 2));
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Health check failed:', error);
                process.exit(1);
            });
    } else {
        setupProduction()
            .then(() => {
                console.log('🎉 Production setup completed successfully!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('💥 Production setup failed:', error);
                process.exit(1);
            });
    }
} 
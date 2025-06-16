const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'heavy_analysis.db');

function calculateBotScore(player) {
    let timing_score = 0;
    let pattern_score = 0;
    let aggression_score = 0;
    let consistency_score = 0;
    let volume_score = 0;
    let behavioral_score = 0; // New category

    // 1. TIMING ANALYSIS (20% weight) - Enhanced with micro-patterns
    if (player.total_sessions > 0 && player.total_playtime_hours > 0) {
        const avg_session_length = player.total_playtime_hours / player.total_sessions;
        const hands_per_hour = player.total_hands / player.total_playtime_hours;
        
        // Suspicious session patterns - bots often have very consistent session lengths
        if (avg_session_length % 1 === 0 && avg_session_length >= 2 && avg_session_length <= 12) {
            timing_score += 35; // Increased penalty for exact hour sessions
        }
        
        // Extended sessions without breaks (bot behavior)
        if (avg_session_length > 10) timing_score += 30;
        else if (avg_session_length > 6) timing_score += 15;
        
        // Superhuman hand rates
        if (hands_per_hour > 250) timing_score += 45;
        else if (hands_per_hour > 200) timing_score += 30;
        else if (hands_per_hour > 150) timing_score += 15;
        
        // Too consistent hand rates (lack of human variation)
        if (hands_per_hour > 100 && hands_per_hour % 10 < 2) {
            timing_score += 25;
        }
    }

    // 2. PATTERN ANALYSIS (25% weight) - Enhanced GTO detection
    if (player.vpip > 0 && player.pfr > 0) {
        const vpip_pfr_ratio = player.pfr / player.vpip;
        
        // Perfect mathematical ratios (bot signatures)
        if (Math.abs(vpip_pfr_ratio - 0.75) < 0.005 || 
            Math.abs(vpip_pfr_ratio - 0.80) < 0.005 ||
            Math.abs(vpip_pfr_ratio - 0.67) < 0.005) {
            pattern_score += 50; // Higher penalty for exact ratios
        }
        
        // Suspicious VPIP ranges
        if (player.vpip < 8 || player.vpip > 55) pattern_score += 30;
        
        // Perfect GTO ranges (too perfect for humans)
        if ((player.vpip >= 22 && player.vpip <= 24) && 
            (player.pfr >= 17 && player.pfr <= 19)) {
            pattern_score += 35;
        }
        
        // Unnatural VPIP/PFR combinations
        if (player.vpip > 0 && player.pfr > 0) {
            if (player.pfr > player.vpip * 0.9) pattern_score += 25; // Too aggressive preflop
            if (player.pfr < player.vpip * 0.3) pattern_score += 20; // Too passive preflop
        }
    }

    // 3. AGGRESSION ANALYSIS (20% weight) - Enhanced with street-by-street analysis
    if (player.aggression_factor > 0) {
        // Perfect aggression factors (bot signatures)
        if (Math.abs(player.aggression_factor - 2.0) < 0.05 || 
            Math.abs(player.aggression_factor - 2.5) < 0.05 ||
            Math.abs(player.aggression_factor - 3.0) < 0.05) {
            aggression_score += 40;
        }
        
        // Extreme aggression factors
        if (player.aggression_factor > 6 || player.aggression_factor < 0.3) {
            aggression_score += 35;
        }
    }

    // Enhanced C-bet analysis (FLOP/TURN/RIVER consistency)
    if (player.cbet_flop > 0 && player.cbet_turn > 0 && player.cbet_river > 0) {
        const cbet_variance = Math.abs(player.cbet_flop - player.cbet_turn) + 
                             Math.abs(player.cbet_turn - player.cbet_river);
        
        // Too consistent across streets (bot behavior)
        if (cbet_variance < 3) aggression_score += 35;
        else if (cbet_variance < 8) aggression_score += 20;
        
        // Perfect mathematical progressions
        if (Math.abs(player.cbet_flop - player.cbet_turn * 1.5) < 2 ||
            Math.abs(player.cbet_turn - player.cbet_river * 1.5) < 2) {
            aggression_score += 30;
        }
    }

    // 4. CONSISTENCY ANALYSIS (15% weight) - Enhanced statistical analysis
    if (player.wtsd > 0 && player.w_sd > 0) {
        // Too close to theoretical optimal (50% showdown win rate)
        if (Math.abs(player.w_sd - 50) < 1) consistency_score += 50;
        else if (Math.abs(player.w_sd - 50) < 3) consistency_score += 30;
        
        // Unrealistic showdown win rates
        if (player.w_sd > 70 || player.w_sd < 30) consistency_score += 35;
        
        // Perfect WTSD percentages
        if (player.wtsd % 5 === 0 && player.wtsd >= 20 && player.wtsd <= 35) {
            consistency_score += 25;
        }
    }

    // 5. VOLUME ANALYSIS (10% weight) - Enhanced with session patterns
    if (player.total_hands > 15000) volume_score += 35;
    else if (player.total_hands > 10000) volume_score += 25;
    else if (player.total_hands > 5000) volume_score += 15;
    
    // Suspicious session counts
    if (player.total_sessions > 200) volume_score += 30;
    else if (player.total_sessions > 100) volume_score += 15;
    
    // Perfect session-to-hands ratios
    if (player.total_sessions > 0) {
        const hands_per_session = player.total_hands / player.total_sessions;
        if (hands_per_session % 50 === 0 || hands_per_session % 100 === 0) {
            volume_score += 20;
        }
    }

    // 6. BEHAVIORAL ANALYSIS (10% weight) - New advanced detection
    // Multi-table consistency (bots play identically across tables)
    if (player.vpip > 0 && player.pfr > 0 && player.aggression_factor > 0) {
        // Check for "too perfect" statistical relationships
        const expected_af = (player.vpip / 100) * 2.5; // Rough human correlation
        if (Math.abs(player.aggression_factor - expected_af) < 0.1) {
            behavioral_score += 30;
        }
        
        // Unnatural stat combinations
        if (player.vpip < 15 && player.aggression_factor > 4) behavioral_score += 25;
        if (player.vpip > 40 && player.aggression_factor < 1) behavioral_score += 25;
    }
    
    // Perfect round numbers (bots often use exact percentages)
    let round_number_count = 0;
    if (player.vpip % 5 === 0) round_number_count++;
    if (player.pfr % 5 === 0) round_number_count++;
    if (player.wtsd % 5 === 0) round_number_count++;
    if (player.w_sd % 5 === 0) round_number_count++;
    
    if (round_number_count >= 3) behavioral_score += 35;
    else if (round_number_count >= 2) behavioral_score += 20;

    // Calculate weighted final score with new weights
    const final_score = Math.min(100, Math.round(
        (timing_score * 0.20) + 
        (pattern_score * 0.25) + 
        (aggression_score * 0.20) + 
        (consistency_score * 0.15) + 
        (volume_score * 0.10) +
        (behavioral_score * 0.10)
    ));

    return {
        timing_score: Math.min(100, timing_score),
        pattern_score: Math.min(100, pattern_score),
        aggression_score: Math.min(100, aggression_score),
        consistency_score: Math.min(100, consistency_score),
        volume_score: Math.min(100, volume_score),
        behavioral_score: Math.min(100, behavioral_score),
        final_score
    };
}

async function calculateAllBotScores() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Get all players with stats
        const query = `
            SELECT 
                player_id,
                total_hands,
                COALESCE(vpip, 0) as vpip,
                COALESCE(pfr, 0) as pfr,
                COALESCE(aggression_factor, 0) as aggression_factor,
                COALESCE(cbet_flop, 0) as cbet_flop,
                COALESCE(cbet_turn, 0) as cbet_turn,
                COALESCE(cbet_river, 0) as cbet_river,
                COALESCE(wtsd, 0) as wtsd,
                COALESCE(w_sd, 0) as w_sd,
                COALESCE(total_sessions, 0) as total_sessions,
                COALESCE(total_playtime_hours, 0) as total_playtime_hours
            FROM player_stats 
            WHERE total_hands > 50
            ORDER BY total_hands DESC
        `;

        db.all(query, [], (err, players) => {
            if (err) {
                console.error('Error fetching players:', err);
                reject(err);
                return;
            }

            console.log(`Processing ${players.length} players...`);
            
            let processed = 0;
            let updated = 0;

            // Process each player
            const updatePromises = players.map((player, index) => {
                return new Promise((resolvePlayer) => {
                    const scores = calculateBotScore(player);
                    
                    db.run(
                        'UPDATE player_stats SET bot_score = ? WHERE player_id = ?',
                        [scores.final_score, player.player_id],
                        function(err) {
                            if (err) {
                                console.error(`Error updating ${player.player_id}:`, err);
                            } else {
                                updated++;
                            }
                            
                            processed++;
                            if (processed % 50 === 0) {
                                console.log(`Processed ${processed}/${players.length} players...`);
                            }
                            
                            resolvePlayer();
                        }
                    );
                });
            });

            // Wait for all updates to complete
            Promise.all(updatePromises).then(() => {
                // Get summary statistics
                db.get(`
                    SELECT 
                        COUNT(*) as total_players,
                        AVG(bot_score) as avg_score,
                        COUNT(CASE WHEN bot_score > 70 THEN 1 END) as high_risk,
                        COUNT(CASE WHEN bot_score BETWEEN 40 AND 70 THEN 1 END) as medium_risk,
                        COUNT(CASE WHEN bot_score < 40 THEN 1 END) as low_risk
                    FROM player_stats 
                    WHERE bot_score IS NOT NULL
                `, [], (err, summary) => {
                    if (err) {
                        console.error('Error getting summary:', err);
                    } else {
                        console.log('\n=== ENHANCED BOT SCORE CALCULATION COMPLETE ===');
                        console.log(`Total players processed: ${updated}`);
                        console.log(`Average bot score: ${Math.round(summary.avg_score * 10) / 10}`);
                        console.log(`High risk players (>70): ${summary.high_risk}`);
                        console.log(`Medium risk players (40-70): ${summary.medium_risk}`);
                        console.log(`Low risk players (<40): ${summary.low_risk}`);
                        console.log('\n🤖 Enhanced Detection Features:');
                        console.log('• Micro-timing pattern analysis');
                        console.log('• Advanced GTO behavior detection');
                        console.log('• Multi-street consistency analysis');
                        console.log('• Statistical anomaly detection');
                        console.log('• Behavioral pattern recognition');
                    }

                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                            reject(err);
                        } else {
                            console.log('Database connection closed');
                            resolve({
                                updated_players: updated,
                                summary: summary
                            });
                        }
                    });
                });
            });
        });
    });
}

// Function to analyze a specific player in detail
function analyzePlayerDetailed(playerId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        const query = `
            SELECT 
                player_id,
                total_hands,
                COALESCE(vpip, 0) as vpip,
                COALESCE(pfr, 0) as pfr,
                COALESCE(aggression_factor, 0) as aggression_factor,
                COALESCE(cbet_flop, 0) as cbet_flop,
                COALESCE(cbet_turn, 0) as cbet_turn,
                COALESCE(cbet_river, 0) as cbet_river,
                COALESCE(wtsd, 0) as wtsd,
                COALESCE(w_sd, 0) as w_sd,
                COALESCE(total_sessions, 0) as total_sessions,
                COALESCE(total_playtime_hours, 0) as total_playtime_hours,
                bot_score
            FROM player_stats 
            WHERE player_id = ?
        `;

        db.get(query, [playerId], (err, player) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!player) {
                reject(new Error(`Player ${playerId} not found`));
                return;
            }

            const scores = calculateBotScore(player);
            
            console.log(`\n🔍 DETAILED BOT ANALYSIS FOR: ${player.player_id}`);
            console.log('='.repeat(60));
            console.log(`Current Bot Score: ${player.bot_score || 'Not calculated'}`);
            console.log(`Calculated Score: ${scores.final_score}`);
            console.log('\n📊 SCORE BREAKDOWN:');
            console.log(`• Timing Analysis (20%):     ${scores.timing_score}/100`);
            console.log(`• Pattern Analysis (25%):    ${scores.pattern_score}/100`);
            console.log(`• Aggression Analysis (20%): ${scores.aggression_score}/100`);
            console.log(`• Consistency Analysis (15%): ${scores.consistency_score}/100`);
            console.log(`• Volume Analysis (10%):     ${scores.volume_score}/100`);
            console.log(`• Behavioral Analysis (10%): ${scores.behavioral_score}/100`);
            
            console.log('\n📈 PLAYER STATISTICS:');
            console.log(`• Total Hands: ${player.total_hands}`);
            console.log(`• VPIP: ${player.vpip}%`);
            console.log(`• PFR: ${player.pfr}%`);
            console.log(`• Aggression Factor: ${player.aggression_factor}`);
            console.log(`• WTSD: ${player.wtsd}%`);
            console.log(`• W$SD: ${player.w_sd}%`);
            console.log(`• Sessions: ${player.total_sessions}`);
            console.log(`• Playtime: ${player.total_playtime_hours}h`);
            
            if (player.total_sessions > 0 && player.total_playtime_hours > 0) {
                const avg_session = player.total_playtime_hours / player.total_sessions;
                const hands_per_hour = player.total_hands / player.total_playtime_hours;
                console.log(`• Avg Session Length: ${avg_session.toFixed(1)}h`);
                console.log(`• Hands per Hour: ${hands_per_hour.toFixed(0)}`);
            }

            db.close();
            resolve(scores);
        });
    });
}

// Run the calculation
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0] === '--analyze') {
        const playerId = args[1];
        if (!playerId) {
            console.error('Please provide a player ID to analyze');
            console.log('Usage: node calculate_bot_scores.js --analyze <player_id>');
            process.exit(1);
        }
        
        analyzePlayerDetailed(playerId)
            .then(() => process.exit(0))
            .catch((error) => {
                console.error('Analysis failed:', error.message);
                process.exit(1);
            });
    } else {
        console.log('Starting enhanced bot score calculation...');
        calculateAllBotScores()
            .then((result) => {
                console.log('Bot score calculation completed successfully!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('Bot score calculation failed:', error);
                process.exit(1);
            });
    }
}

module.exports = { calculateAllBotScores, analyzePlayerDetailed }; 
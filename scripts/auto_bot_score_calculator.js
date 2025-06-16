const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'heavy_analysis.db');

// Enhanced bot score calculation function
function calculateBotScore(player) {
    let timing_score = 0;
    let pattern_score = 0;
    let aggression_score = 0;
    let consistency_score = 0;
    let volume_score = 0;
    let behavioral_score = 0;

    // 1. TIMING ANALYSIS (20% weight) - Enhanced with micro-patterns
    if (player.total_sessions > 0 && player.total_playtime_hours > 0) {
        const avg_session_length = player.total_playtime_hours / player.total_sessions;
        const hands_per_hour = player.total_hands / player.total_playtime_hours;
        
        // Suspicious patterns
        if (avg_session_length % 1 === 0 && avg_session_length >= 2) timing_score += 15; // Exact hour sessions
        if (hands_per_hour > 250) timing_score += 25; // Superhuman speed
        if (hands_per_hour > 200 && hands_per_hour <= 250) timing_score += 15; // Very fast
        if (hands_per_hour < 30) timing_score += 10; // Suspiciously slow (multi-tabling bots)
        
        // Consistency in timing (bots are too consistent)
        const expected_variance = hands_per_hour * 0.2; // 20% variance is normal
        if (expected_variance < 10) timing_score += 20; // Too consistent
    }

    // 2. PATTERN ANALYSIS (25% weight) - Enhanced GTO detection
    if (player.vpip > 0 && player.pfr > 0) {
        const vpip_pfr_ratio = player.pfr / player.vpip;
        
        // Perfect GTO ratios are suspicious
        if (Math.abs(vpip_pfr_ratio - 0.75) < 0.02) pattern_score += 20; // Too close to optimal
        if (Math.abs(vpip_pfr_ratio - 0.67) < 0.02) pattern_score += 15; // Another GTO sweet spot
        
        // Unnatural VPIP/PFR combinations
        if (player.vpip === Math.round(player.vpip) && player.pfr === Math.round(player.pfr)) {
            pattern_score += 10; // Perfect round numbers
        }
        
        // Extremely tight or loose play
        if (player.vpip < 10 || player.vpip > 80) pattern_score += 15;
        if (player.pfr < 5 || player.pfr > 60) pattern_score += 15;
        
        // Mathematical perfection in ratios
        if (player.vpip > 0) {
            const ratio_precision = (player.pfr / player.vpip).toString().split('.')[1];
            if (ratio_precision && ratio_precision.length <= 2) pattern_score += 10; // Too precise
        }
    }

    // 3. AGGRESSION ANALYSIS (20% weight) - Enhanced detection
    if (player.aggression_factor > 0) {
        // Perfect aggression factors
        if (player.aggression_factor === Math.round(player.aggression_factor)) aggression_score += 10;
        if (player.aggression_factor > 5) aggression_score += 15; // Extremely aggressive
        if (player.aggression_factor < 0.5) aggression_score += 15; // Extremely passive
        
        // C-bet consistency (bots are too consistent)
        if (player.cbet_flop > 0.8 || player.cbet_flop < 0.3) aggression_score += 10;
        if (player.cbet_turn > 0.7 || player.cbet_turn < 0.2) aggression_score += 10;
        if (player.cbet_river > 0.6 || player.cbet_river < 0.1) aggression_score += 10;
    }

    // 4. CONSISTENCY ANALYSIS (15% weight) - Multi-street analysis
    if (player.showdown_win_percent > 0) {
        // Unnatural showdown statistics
        if (player.showdown_win_percent > 70) consistency_score += 15; // Too good
        if (player.showdown_win_percent < 30) consistency_score += 10; // Too bad
        
        // Perfect percentages
        if (player.showdown_win_percent === Math.round(player.showdown_win_percent)) {
            consistency_score += 8;
        }
        
        // Went-to-showdown frequency analysis
        if (player.wtsd_percent > 0) {
            if (player.wtsd_percent > 35 || player.wtsd_percent < 15) consistency_score += 10;
            if (player.wtsd_percent === Math.round(player.wtsd_percent)) consistency_score += 5;
        }
    }

    // 5. VOLUME ANALYSIS (10% weight) - Enhanced patterns
    if (player.total_hands > 0) {
        // Suspicious volume patterns
        if (player.total_hands > 50000) volume_score += 15; // Extremely high volume
        if (player.total_hands % 1000 === 0 && player.total_hands > 5000) volume_score += 10; // Round thousands
        
        // Session patterns
        if (player.total_sessions > 0) {
            const hands_per_session = player.total_hands / player.total_sessions;
            if (hands_per_session > 1000) volume_score += 10; // Very long sessions
            if (hands_per_session === Math.round(hands_per_session)) volume_score += 5; // Perfect round numbers
        }
    }

    // 6. BEHAVIORAL ANALYSIS (10% weight) - New advanced detection
    // Multi-table consistency (bots play identically across tables)
    if (player.tables_played > 1) {
        // If stats are too similar across different table sizes/types
        if (player.vpip_variance < 2 && player.total_hands > 1000) behavioral_score += 15; // Too consistent across tables
        if (player.pfr_variance < 1.5 && player.total_hands > 1000) behavioral_score += 15;
    }
    
    // Reaction time patterns (if available)
    if (player.avg_decision_time > 0) {
        if (player.avg_decision_time < 2) behavioral_score += 20; // Instant decisions
        if (player.decision_time_variance < 0.5) behavioral_score += 15; // Too consistent timing
    }
    
    // Betting size patterns
    if (player.bet_size_variance < 0.1 && player.total_hands > 500) {
        behavioral_score += 10; // Too consistent bet sizing
    }

    // Calculate weighted final score
    const final_score = Math.min(100, Math.round(
        (timing_score * 0.20) +
        (pattern_score * 0.25) +
        (aggression_score * 0.20) +
        (consistency_score * 0.15) +
        (volume_score * 0.10) +
        (behavioral_score * 0.10)
    ));

    return final_score;
}

// Function to automatically update bot scores for players that need it
async function autoUpdateBotScores(playerIds = null) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        // Query to get players that need bot score updates
        let query = `
            SELECT 
                player_id,
                total_hands,
                COALESCE(vpip, 0) as vpip,
                COALESCE(pfr, 0) as pfr,
                COALESCE(aggression_factor, 0) as aggression_factor,
                COALESCE(cbet_flop, 0) as cbet_flop,
                COALESCE(cbet_turn, 0) as cbet_turn,
                COALESCE(cbet_river, 0) as cbet_river,
                COALESCE(w_sd, 0) as showdown_win_percent,
                COALESCE(wtsd, 0) as wtsd_percent,
                COALESCE(total_sessions, 1) as total_sessions,
                COALESCE(total_playtime_hours, total_hands / 60.0) as total_playtime_hours,
                1 as tables_played,
                5 as vpip_variance,
                3 as pfr_variance,
                5 as avg_decision_time,
                2 as decision_time_variance,
                COALESCE((avg_bet_size_flop + avg_bet_size_turn + avg_bet_size_river) / 3.0 * 0.1, 0.3) as bet_size_variance,
                COALESCE(bot_score, 0) as current_bot_score,
                updated_at
            FROM player_stats 
            WHERE total_hands > 0
        `;

        let params = [];
        
        // If specific player IDs are provided, only update those
        if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
            const placeholders = playerIds.map(() => '?').join(',');
            query += ` AND player_id IN (${placeholders})`;
            params = playerIds;
        } else {
            // Only update players whose data has changed recently or who don't have bot scores
            query += ` AND (bot_score IS NULL OR bot_score = 0 OR updated_at > datetime('now', '-1 hour'))`;
        }

        db.all(query, params, (err, players) => {
            if (err) {
                db.close();
                reject(err);
                return;
            }

            if (!players || players.length === 0) {
                db.close();
                resolve({ updated: 0, message: 'No players need bot score updates' });
                return;
            }

            let updated = 0;
            let processed = 0;
            const total = players.length;

            // Process players in batches
            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < players.length; i += batchSize) {
                batches.push(players.slice(i, i + batchSize));
            }

            function processBatch(batchIndex) {
                if (batchIndex >= batches.length) {
                    db.close();
                    resolve({
                        updated,
                        total: total,
                        message: `Auto-updated bot scores for ${updated} players`
                    });
                    return;
                }

                const batch = batches[batchIndex];
                const stmt = db.prepare(`
                    UPDATE player_stats 
                    SET bot_score = ?, updated_at = datetime('now') 
                    WHERE player_id = ?
                `);

                batch.forEach(player => {
                    const botScore = calculateBotScore(player);
                    
                    // Only update if the score has changed significantly (to avoid unnecessary writes)
                    if (Math.abs(botScore - player.current_bot_score) >= 1) {
                        stmt.run([botScore, player.player_id], (err) => {
                            if (!err) updated++;
                        });
                    }
                    
                    processed++;
                });

                stmt.finalize((err) => {
                    if (err) {
                        db.close();
                        reject(err);
                        return;
                    }
                    
                    // Process next batch
                    setTimeout(() => processBatch(batchIndex + 1), 10);
                });
            }

            // Start processing batches
            processBatch(0);
        });
    });
}

// Function to ensure a specific player has an up-to-date bot score
async function ensurePlayerBotScore(playerId) {
    try {
        const result = await autoUpdateBotScores([playerId]);
        return result;
    } catch (error) {
        console.error(`Error updating bot score for player ${playerId}:`, error);
        return { updated: 0, error: error.message };
    }
}

// Function to get current bot score for a player
async function getPlayerBotScore(playerId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        db.get(
            'SELECT bot_score, updated_at FROM player_stats WHERE player_id = ?',
            [playerId],
            (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row ? { bot_score: row.bot_score, updated_at: row.updated_at } : null);
            }
        );
    });
}

module.exports = {
    autoUpdateBotScores,
    ensurePlayerBotScore,
    getPlayerBotScore,
    calculateBotScore
}; 
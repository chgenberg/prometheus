const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'heavy_analysis.db');

// Bot score calculation function (simplified for trigger use)
function calculateBotScoreSQL() {
    return `
    CASE 
        WHEN NEW.total_hands < 100 THEN 5.0
        ELSE 
            -- Timing Analysis (20%)
            (CASE 
                WHEN NEW.total_sessions > 0 AND NEW.total_playtime_hours > 0 THEN
                    CASE 
                        WHEN (NEW.total_hands / NEW.total_playtime_hours) > 250 THEN 20.0
                        WHEN (NEW.total_hands / NEW.total_playtime_hours) > 200 THEN 15.0
                        WHEN (NEW.total_hands / NEW.total_playtime_hours) > 150 THEN 10.0
                        ELSE 5.0
                    END
                ELSE 5.0
            END) * 0.20 +
            
            -- Pattern Analysis (25%)
            (CASE 
                WHEN NEW.vpip > 0 AND NEW.pfr > 0 THEN
                    CASE 
                        WHEN ABS(NEW.vpip - NEW.pfr) < 2 AND NEW.vpip BETWEEN 20 AND 25 THEN 25.0
                        WHEN ABS(NEW.vpip - NEW.pfr) < 3 AND NEW.vpip BETWEEN 18 AND 28 THEN 20.0
                        WHEN ABS(NEW.vpip - NEW.pfr) < 5 THEN 15.0
                        ELSE 8.0
                    END
                ELSE 8.0
            END) * 0.25 +
            
            -- Aggression Analysis (20%)
            (CASE 
                WHEN NEW.aggression_factor BETWEEN 2.8 AND 3.2 THEN 20.0
                WHEN NEW.aggression_factor BETWEEN 2.5 AND 3.5 THEN 15.0
                WHEN NEW.aggression_factor BETWEEN 2.0 AND 4.0 THEN 10.0
                ELSE 5.0
            END) * 0.20 +
            
            -- Consistency Analysis (15%)
            (CASE 
                WHEN NEW.w_sd BETWEEN 48 AND 52 THEN 15.0
                WHEN NEW.w_sd BETWEEN 45 AND 55 THEN 12.0
                WHEN NEW.w_sd BETWEEN 40 AND 60 THEN 8.0
                ELSE 5.0
            END) * 0.15 +
            
            -- Volume Analysis (10%)
            (CASE 
                WHEN NEW.total_hands > 10000 THEN 10.0
                WHEN NEW.total_hands > 5000 THEN 8.0
                WHEN NEW.total_hands > 1000 THEN 6.0
                ELSE 3.0
            END) * 0.10 +
            
            -- Behavioral Analysis (10%)
            (CASE 
                WHEN NEW.wtsd BETWEEN 28 AND 32 THEN 10.0
                WHEN NEW.wtsd BETWEEN 25 AND 35 THEN 8.0
                WHEN NEW.wtsd BETWEEN 20 AND 40 THEN 5.0
                ELSE 3.0
            END) * 0.10
    END`;
}

function setupAutoBotScores() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('Connected to SQLite database for trigger setup');
        });

        // First, check if bot_score column exists, if not add it
        db.run(`
            ALTER TABLE player_stats 
            ADD COLUMN bot_score REAL DEFAULT 0.0
        `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log('Column might already exist:', err.message);
            } else {
                console.log('Added bot_score column to player_stats table');
            }

            // Drop existing triggers if they exist
            db.run(`DROP TRIGGER IF EXISTS auto_update_bot_score`, (err) => {
                if (err) {
                    console.log('No existing update trigger to drop:', err.message);
                }
                
                db.run(`DROP TRIGGER IF EXISTS auto_insert_bot_score`, (err) => {
                    if (err) {
                        console.log('No existing insert trigger to drop:', err.message);
                    }

                    // Create trigger for automatic bot score calculation
                    const triggerSQL = `
                        CREATE TRIGGER auto_update_bot_score
                        AFTER UPDATE ON player_stats
                        FOR EACH ROW
                        WHEN NEW.total_hands != OLD.total_hands OR 
                             NEW.vpip != OLD.vpip OR 
                             NEW.pfr != OLD.pfr OR
                             NEW.aggression_factor != OLD.aggression_factor OR
                             NEW.w_sd != OLD.w_sd
                        BEGIN
                            UPDATE player_stats 
                            SET bot_score = ${calculateBotScoreSQL()}
                            WHERE player_id = NEW.player_id;
                        END;
                    `;

                    db.run(triggerSQL, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log('✅ Created automatic bot score trigger');

                        // Also create trigger for INSERT operations
                        const insertTriggerSQL = `
                            CREATE TRIGGER auto_insert_bot_score
                            AFTER INSERT ON player_stats
                            FOR EACH ROW
                            BEGIN
                                UPDATE player_stats 
                                SET bot_score = ${calculateBotScoreSQL()}
                                WHERE player_id = NEW.player_id;
                            END;
                        `;

                        db.run(insertTriggerSQL, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            console.log('✅ Created automatic bot score insert trigger');

                            // Calculate initial bot scores for all existing players
                            const updateAllSQL = `
                                UPDATE player_stats 
                                SET bot_score = ${calculateBotScoreSQL().replace(/NEW\./g, '')}
                                WHERE bot_score IS NULL OR bot_score = 0.0;
                            `;

                            db.run(updateAllSQL, function(err) {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                console.log(`✅ Updated bot scores for ${this.changes} existing players`);

                                db.close((err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    console.log('Database connection closed');
                                    resolve({
                                        message: 'Automatic bot score system setup complete',
                                        updated_players: this.changes
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

// Run the setup
if (require.main === module) {
    console.log('🤖 Setting up automatic bot score calculation...\n');
    setupAutoBotScores()
        .then((result) => {
            console.log('\n🎉 Setup completed successfully!');
            console.log('Bot scores will now be calculated automatically when player data changes.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupAutoBotScores }; 